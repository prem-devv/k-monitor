import { Worker } from 'bullmq';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import net from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
async function checkHttp(url, timeout, keyword, expectedStatus) {
    const start = Date.now();
    try {
        const response = await axios.get(url, {
            timeout: timeout * 1000,
            validateStatus: () => true,
        });
        const latency = Date.now() - start;
        if (expectedStatus && response.status !== expectedStatus) {
            return { up: false, latency, message: `Expected ${expectedStatus}, got ${response.status}` };
        }
        if (keyword && !response.data.includes(keyword)) {
            return { up: false, latency, message: `Keyword "${keyword}" not found` };
        }
        return { up: true, latency, message: `HTTP ${response.status}` };
    }
    catch (error) {
        const latency = Date.now() - start;
        return { up: false, latency, message: error.message || 'Request failed' };
    }
}
async function checkTcp(host, port, timeout) {
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
async function checkIcmp(host, timeout) {
    const start = Date.now();
    try {
        const platform = process.platform;
        let cmd;
        if (platform === 'win32') {
            cmd = `ping -n 1 -w ${timeout * 1000} ${host}`;
        }
        else {
            cmd = `ping -c 1 -W ${timeout} ${host}`;
        }
        const { stdout } = await execAsync(cmd, { timeout: timeout * 1000 + 1000 });
        const latency = Date.now() - start;
        if (stdout.includes('bytes from') || stdout.includes('Reply from')) {
            return { up: true, latency, message: 'Reply received' };
        }
        else {
            return { up: false, latency, message: 'Host unreachable' };
        }
    }
    catch (error) {
        const latency = Date.now() - start;
        return { up: false, latency, message: error.message || 'Ping failed' };
    }
}
async function handleJob(job) {
    const { monitorId, type, url, port, timeout, keyword, expectedStatus } = job.data;
    let result;
    switch (type) {
        case 'http':
            result = await checkHttp(url, timeout, keyword, expectedStatus);
            break;
        case 'tcp':
            const [host, portStr] = (url || '').split(':');
            result = await checkTcp(host || url, port || parseInt(portStr || '80'), timeout);
            break;
        case 'icmp':
            result = await checkIcmp(url, timeout);
            break;
        default:
            result = { up: false, latency: 0, message: 'Unknown monitor type' };
    }
    await db.insert(schema.heartbeats).values({
        monitorId: monitorId,
        status: result.up ? 'up' : 'down',
        latency: result.latency,
        message: result.message,
        createdAt: Date.now(),
    });
    const monitor = await db.query.monitors.findFirst({
        where: eq(schema.monitors.id, monitorId),
    });
    if (monitor?.webhookUrl) {
        const lastStatus = await getLastHeartbeatStatus(monitorId);
        if (result.up !== lastStatus) {
            await sendWebhook(monitor.webhookUrl, {
                monitorId,
                name: monitor.name,
                status: result.up ? 'up' : 'down',
                message: result.message,
                timestamp: Date.now(),
            });
        }
    }
    return result;
}
async function getLastHeartbeatStatus(monitorId) {
    const heartbeats = await db.query.heartbeats.findMany({
        where: eq(schema.heartbeats.monitorId, monitorId),
        limit: 1,
    });
    if (heartbeats.length === 0)
        return true;
    const sortedHeartbeats = heartbeats.sort((a, b) => b.createdAt - a.createdAt);
    return sortedHeartbeats[0]?.status === 'up';
}
async function sendWebhook(webhookUrl, data) {
    try {
        await axios.post(webhookUrl, data, { timeout: 5000 });
    }
    catch (error) {
        console.error('Webhook failed:', error);
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
