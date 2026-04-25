import { Worker, Job } from 'bullmq';
import { db, schema } from '../db/index.js';
import { eq, desc } from 'drizzle-orm';
import axios from 'axios';
import net from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';
import nodemailer from 'nodemailer';
import tls from 'tls';
import dns from 'dns/promises';

const execAsync = promisify(exec);

interface MonitorJob {
  monitorId: number;
  type: 'http' | 'tcp' | 'icmp' | 'ssl' | 'dns';
  url: string;
  port?: number;
  timeout: number;
  keyword?: string;
  expectedStatus?: number;
}

import https from 'https';

async function checkHttp(url: string, timeout: number, keyword?: string, expectedStatus?: number): Promise<{ up: boolean; latency: number; message: string }> {
  const start = Date.now();
  try {
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const response = await axios.get(url, {
      timeout: timeout * 1000,
      validateStatus: () => true,
      httpsAgent,
    });
    const latency = Date.now() - start;

    if (expectedStatus && response.status !== expectedStatus) {
      return { up: false, latency, message: `Expected ${expectedStatus}, got ${response.status}` };
    }

    if (keyword && !response.data.includes(keyword)) {
      return { up: false, latency, message: `Keyword "${keyword}" not found` };
    }

    return { up: true, latency, message: `HTTP ${response.status}` };
  } catch (error: any) {
    const latency = Date.now() - start;
    return { up: false, latency, message: error.message || 'Request failed' };
  }
}

async function checkTcp(host: string, port: number, timeout: number): Promise<{ up: boolean; latency: number; message: string }> {
  const start = Date.now();

  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeoutId = setTimeout(() => {
      socket.destroy();
      resolve({ up: false, latency: timeout * 1000, message: 'Connection timeout' });
    }, timeout * 1000);

    socket.connect(port, host, () => {
      clearTimeout(timeoutId);
      const latency = Date.now() - start;
      socket.destroy();
      resolve({ up: true, latency, message: `Connected to port ${port}` });
    });

    socket.on('error', (err) => {
      clearTimeout(timeoutId);
      const latency = Date.now() - start;
      socket.destroy();
      resolve({ up: false, latency, message: err.message });
    });
  });
}

async function checkIcmp(host: string, timeout: number): Promise<{ up: boolean; latency: number; message: string }> {
  const start = Date.now();
  
  try {
    const platform = process.platform;
    let cmd: string;
    const cleanHost = host.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, '$1');
    
    if (platform === 'win32') {
      cmd = `ping -n 1 -w ${timeout * 1000} ${cleanHost}`;
    } else {
      cmd = `ping -c 1 -W ${timeout} ${cleanHost}`;
    }
    
    const { stdout } = await execAsync(cmd, { timeout: timeout * 1000 + 1000 });
    const latency = Date.now() - start;
    
    if (stdout.includes('bytes from') || stdout.includes('Reply from')) {
      return { up: true, latency, message: 'Reply received' };
    } else {
      return { up: false, latency, message: 'Host unreachable' };
    }
  } catch (error: any) {
    const latency = Date.now() - start;
    return { up: false, latency, message: error.message || 'Ping failed' };
  }
}

async function checkDns(hostname: string, timeout: number): Promise<{ up: boolean; latency: number; message: string }> {
  let timer: NodeJS.Timeout;
  const start = Date.now();
  try {
    const timeoutPromise = new Promise<{ up: boolean; latency: number; message: string }>((_, reject) => {
      timer = setTimeout(() => reject(new Error('DNS Resolution timeout')), timeout * 1000);
    });
    
    // strip http schemas and ports for dns check
    const cleanHostname = hostname.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, '$1');

    const result = await Promise.race([
      dns.resolve(cleanHostname),
      timeoutPromise
    ]);
    
    clearTimeout(timer!);
    const latency = Date.now() - start;
    const addresses = result as string[];
    
    if (addresses && addresses.length > 0) {
      return { up: true, latency, message: `Resolved to ${addresses[0]}` };
    }
    return { up: false, latency, message: 'No records found' };
  } catch (error: any) {
    clearTimeout(timer!);
    const latency = Date.now() - start;
    return { up: false, latency, message: error.message || 'DNS Resolution failed' };
  }
}

async function checkSsl(hostname: string, port: number = 443, timeout: number): Promise<{ up: boolean; latency: number; message: string }> {
  const start = Date.now();
  // Strip protocol schema for SSL check
  const cleanHostname = hostname.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, '$1');

  return new Promise((resolve) => {
    try {
      const socket = tls.connect(port, cleanHostname, { servername: cleanHostname, rejectUnauthorized: false });
      
      const timeoutId = setTimeout(() => {
        socket.destroy();
        resolve({ up: false, latency: timeout * 1000, message: 'SSL Connection timeout' });
      }, timeout * 1000);
      
      socket.on('secureConnect', () => {
        clearTimeout(timeoutId);
        const cert = socket.getPeerCertificate();
        const latency = Date.now() - start;
        socket.end();
        
        if (!cert || !cert.valid_to) {
            resolve({ up: false, latency, message: 'No valid_to date found on certificate' });
            return;
        }
        
        const expiresAt = new Date(cert.valid_to).getTime();
        const daysRemaining = (expiresAt - Date.now()) / (1000 * 60 * 60 * 24);
        
        if (daysRemaining < 14) {
            resolve({ up: false, latency, message: `Cert expires very soon! (${daysRemaining.toFixed(1)} days)` });
        } else {
            resolve({ up: true, latency, message: `Cert valid for ${daysRemaining.toFixed(1)} days` });
        }
      });
      
      socket.on('error', (err) => {
        clearTimeout(timeoutId);
        socket.destroy();
        resolve({ up: false, latency: Date.now() - start, message: err.message });
      });
    } catch (e: any) {
        resolve({ up: false, latency: Date.now() - start, message: e.message || 'TLS execution error' });
    }
  });
}

async function handleJob(job: Job<MonitorJob>) {
  const { monitorId, type, url, port, timeout, keyword, expectedStatus } = job.data;
  
  let result: { up: boolean; latency: number; message: string };
  
  switch (type) {
    case 'http':
      result = await checkHttp(url, timeout, keyword, expectedStatus);
      break;
    case 'tcp': {
      const cleanUrl = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?/img, '');
      const parts = cleanUrl.split(':');
      result = await checkTcp(parts[0], port || parseInt(parts[1] || '80'), timeout);
      break;
    }
    case 'icmp':
      result = await checkIcmp(url, timeout);
      break;
    case 'dns':
      result = await checkDns(url, timeout);
      break;
    case 'ssl': {
      const cleanUrl = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?/img, '');
      const parts = cleanUrl.split(':');
      result = await checkSsl(parts[0], port || parseInt(parts[1] || '443'), timeout);
      break;
    }
    default:
      result = { up: false, latency: 0, message: 'Unknown monitor type' };
  }

  const monitor = await db.query.monitors.findFirst({
    where: eq(schema.monitors.id, monitorId),
  });

  if (!monitor) {
    console.warn(`Monitor ${monitorId} not found. Skipping heartbeat.`);
    return result;
  }

  const lastStatus = await getLastHeartbeatStatus(monitorId);
  const inMaintenance = monitor?.maintenanceUntil && (monitor.maintenanceUntil * 1000 > Date.now());

  await db.insert(schema.heartbeats).values({
    monitorId: monitorId,
    status: result.up ? 'up' : 'down',
    latency: result.latency,
    message: result.message,
    createdAt: Date.now(),
  });

  if (result.up !== lastStatus && !inMaintenance) {
    if (monitor?.webhookUrl) {
      await sendWebhook(monitor.webhookUrl, {
        monitorId,
        name: monitor?.name || 'Unknown',
        status: result.up ? 'up' : 'down',
        message: result.message,
        timestamp: Date.now(),
      });
    }
    // Also send Global Email alert
    await sendEmailAlert({
      monitorId,
      name: monitor?.name || 'Unknown',
      status: result.up ? 'up' : 'down',
      message: result.message,
      timestamp: Date.now(),
    });
  }

  return result;
}

async function getLastHeartbeatStatus(monitorId: number): Promise<boolean> {
  const heartbeats = await db.query.heartbeats.findMany({
    where: eq(schema.heartbeats.monitorId, monitorId),
    orderBy: [desc(schema.heartbeats.createdAt)],
    limit: 1,
  });
  
  if (heartbeats.length === 0) return true;
  
  return heartbeats[0]?.status === 'up';
}

async function sendWebhook(webhookUrl: string, data: any) {
  try {
    let payload: any = data;
    const statusText = data.status === 'up' ? '✅ UP' : '🚨 Down';
    const messageText = `${data.name} ${statusText}`;

    if (webhookUrl.includes('discord.com')) {
      payload = {
        content: `**[K-Monitor Alert]** ${messageText}\n_Message:_ ${data.message}`
      };
    } else if (webhookUrl.includes('hooks.slack.com')) {
      payload = {
        text: `*[K-Monitor Alert]* ${messageText}\n_Message:_ ${data.message}`
      };
    } else if (webhookUrl.includes('chat.googleapis.com')) {
      payload = {
        text: messageText
      };
    } else {
      payload = { text: messageText, ...data };
    }
    await axios.post(webhookUrl, payload, { timeout: 5000 });
  } catch (error) {
    console.error('Webhook failed:', error);
  }
}

async function sendEmailAlert(data: any) {
  try {
    // Stub for retrieving global SMTP settings from DB
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: 'mockUser', pass: 'mockPass' }
    });
    await transporter.sendMail({
      from: '"K-Monitor Alerts" <noreply@kmonitor.local>',
      to: 'admin@kmonitor.local', // Would use settings.notificationEmail
      subject: `[K-Monitor Alert] ${data.name} is ${data.status.toUpperCase()}`,
      text: `Monitor: ${data.name}\nStatus: ${data.status.toUpperCase()}\nMessage: ${data.message}\nTime: ${new Date(data.timestamp).toISOString()}`
    });
    console.log(`Email alert dispatched internally for ${data.name} (${data.status.toUpperCase()})`);
  } catch (error: any) {
    console.error('Email alert dispatch failed:', error.message);
  }
}

export function createWorker() {
  const worker = new Worker('monitoring', handleJob, {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
  });

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed for monitor ${job.data.monitorId}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  return worker;
}