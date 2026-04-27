import { jsonDb } from '../db/jsonDb.js';

const intervals: Map<number, NodeJS.Timeout> = new Map();

export async function scheduleMonitor(monitorId: number) {
  const monitor = jsonDb.monitors.findFirst(monitorId);
  if (!monitor || !monitor.active) return;

  runCheck(monitorId, monitor.type, monitor.url, monitor.port, monitor.timeout, monitor.keyword, monitor.expectedStatus);
}

async function runCheck(
  monitorId: number,
  type: string,
  url: string,
  port: number | null,
  timeout: number,
  keyword?: string | null,
  expectedStatus?: number | null
) {
  const start = Date.now();
  let result: { up: boolean; latency: number; message: string };

  try {
    if (type === 'http') {
      const { default: axios } = await import('axios');
      const https = await import('https');
      const httpsAgent = new https.Agent({ rejectUnauthorized: false });
      const response = await axios.get(url, {
        timeout: timeout * 1000,
        validateStatus: () => true,
        httpsAgent,
      });
      const latency = Date.now() - start;
      
      if (expectedStatus && response.status !== expectedStatus) {
        result = { up: false, latency, message: `Expected ${expectedStatus}, got ${response.status}` };
      } else if (keyword && !response.data.includes(keyword)) {
        result = { up: false, latency, message: `Keyword "${keyword}" not found` };
      } else {
        result = { up: true, latency, message: `HTTP ${response.status}` };
      }
    } else if (type === 'tcp') {
      const net = await import('net');
      result = await new Promise((resolve) => {
        const socket = new net.Socket();
        const timer = setTimeout(() => {
          socket.destroy();
          resolve({ up: false, latency: timeout * 1000, message: 'Connection timeout' });
        }, timeout * 1000);
        
        socket.connect(port || 80, url.replace(/^(?:https?:\/\/)?/, '').split(':')[0], () => {
          clearTimeout(timer);
          resolve({ up: true, latency: Date.now() - start, message: `Connected to port ${port || 80}` });
        });
        
        socket.on('error', (err) => {
          clearTimeout(timer);
          resolve({ up: false, latency: Date.now() - start, message: err.message });
        });
      });
    } else {
      result = { up: true, latency: Date.now() - start, message: `${type} check completed` };
    }
  } catch (error: any) {
    result = { up: false, latency: Date.now() - start, message: error.message || 'Check failed' };
  }

  jsonDb.heartbeats.create({
    monitorId,
    status: result.up ? 'up' : 'down',
    latency: result.latency,
    message: result.message,
    createdAt: Date.now(),
  });
}

export async function scheduleAllMonitors() {
  const monitors = jsonDb.monitors.findMany().filter(m => m.active);
  
  for (const monitor of monitors) {
    scheduleMonitorWithInterval(monitor.id, monitor.interval);
  }
  
  console.log(`Scheduled ${monitors.length} monitors`);
}

export async function scheduleMonitorWithInterval(monitorId: number, intervalSeconds: number) {
  const monitor = jsonDb.monitors.findFirst(monitorId);
  if (!monitor || !monitor.active) return;

  cancelMonitorSchedule(monitorId);

  const intervalMs = intervalSeconds * 1000;
  
  runCheck(monitorId, monitor.type, monitor.url, monitor.port, monitor.timeout, monitor.keyword, monitor.expectedStatus);
  
  const intervalId = setInterval(() => {
    runCheck(monitorId, monitor.type, monitor.url, monitor.port, monitor.timeout, monitor.keyword, monitor.expectedStatus);
  }, intervalMs);
  
  intervals.set(monitorId, intervalId);
  console.log(`Monitor ${monitorId} scheduled every ${intervalSeconds}s`);
}

export function cancelMonitorSchedule(monitorId: number) {
  const existing = intervals.get(monitorId);
  if (existing) {
    clearInterval(existing);
    intervals.delete(monitorId);
    console.log(`Cancelled monitor ${monitorId}`);
  }
}

export async function getUptimePercentage(monitorId: number): Promise<number> {
  const heartbeats = jsonDb.heartbeats.findMany(monitorId, 1440);
  const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
  const recentHeartbeats = heartbeats.filter(h => h.createdAt > cutoffTime);
  
  if (recentHeartbeats.length === 0) return 100;
  
  const upCount = recentHeartbeats.filter(h => h.status === 'up').length;
  return (upCount / recentHeartbeats.length) * 100;
}