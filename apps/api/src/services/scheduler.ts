import { jsonDb } from '../db/jsonDb.js';

const intervals: Map<number, NodeJS.Timeout> = new Map();

async function runCheck(
  monitorId: number,
  type: string,
  url: string,
  port: number | null,
  timeout: number,
  keyword?: string | null,
  expectedStatus?: number | null
): Promise<void> {
  const start = Date.now();
  let up = false;
  let latency = 0;
  let message = 'Unknown error';

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
      latency = Date.now() - start;

      if (expectedStatus && response.status !== expectedStatus) {
        up = false;
        message = `Expected ${expectedStatus}, got ${response.status}`;
      } else if (keyword && !String(response.data).includes(keyword)) {
        up = false;
        message = `Keyword "${keyword}" not found`;
      } else {
        up = true;
        message = `HTTP ${response.status}`;
      }
    } else if (type === 'tcp') {
      const net = await import('net');
      const tcpResult = await new Promise<{ up: boolean; latency: number; message: string }>((resolve) => {
        const socket = new net.Socket();
        const timer = setTimeout(() => {
          socket.destroy();
          resolve({ up: false, latency: timeout * 1000, message: 'Connection timeout' });
        }, timeout * 1000);

        const host = url.replace(/^(?:https?:\/\/)?/, '').split(/[/?#:]/)[0];
        socket.connect(port || 80, host, () => {
          clearTimeout(timer);
          socket.destroy();
          resolve({ up: true, latency: Date.now() - start, message: `Connected to port ${port || 80}` });
        });

        socket.on('error', (err) => {
          clearTimeout(timer);
          resolve({ up: false, latency: Date.now() - start, message: err.message });
        });
      });
      up = tcpResult.up;
      latency = tcpResult.latency;
      message = tcpResult.message;
    } else if (type === 'icmp') {
      const ping = await import('ping');
      const host = url.replace(/^(?:https?:\/\/)?/, '').split(/[/?#:]/)[0];
      console.log(`[ICMP] Pinging host: ${host}`);
      const res = await ping.default.promise.probe(host, { timeout });
      console.log(`[ICMP] Result for ${host}: alive=${res.alive}, time=${res.time}`);
      latency = res.alive && res.time !== 'unknown' ? Number(res.time) : timeout * 1000;
      up = res.alive;
      message = res.alive ? `Ping OK (${res.time}ms)` : 'Ping timeout or unreachable';
    } else {
      // ssl / dns / unknown — placeholder
      up = true;
      latency = Date.now() - start;
      message = `${type} check not fully implemented`;
    }
  } catch (error: any) {
    up = false;
    latency = Date.now() - start;
    message = error?.message || 'Check failed';
    console.error(`[CHECK ERROR] monitor=${monitorId} type=${type}:`, error?.message);
  }

  console.log(`[HEARTBEAT] monitor=${monitorId} type=${type} up=${up} latency=${latency}ms msg="${message}"`);

  jsonDb.heartbeats.create({
    monitorId,
    status: up ? 'up' : 'down',
    latency,
    message,
    createdAt: Date.now(),
  });
}

export async function scheduleAllMonitors() {
  const monitors = jsonDb.monitors.findMany().filter(m => m.active);

  for (const monitor of monitors) {
    await scheduleMonitorWithInterval(monitor.id, monitor.interval);
  }

  console.log(`Scheduled ${monitors.length} monitors`);
}

export async function scheduleMonitorWithInterval(monitorId: number, intervalSeconds: number) {
  const monitor = jsonDb.monitors.findFirst(monitorId);
  if (!monitor || !monitor.active) return;

  cancelMonitorSchedule(monitorId);

  const intervalMs = intervalSeconds * 1000;

  // Run first check immediately and await it
  await runCheck(
    monitorId, monitor.type, monitor.url, monitor.port,
    monitor.timeout, monitor.keyword, monitor.expectedStatus
  );

  const intervalId = setInterval(() => {
    runCheck(
      monitorId, monitor.type, monitor.url, monitor.port,
      monitor.timeout, monitor.keyword, monitor.expectedStatus
    ).catch(err => console.error(`[SCHEDULE ERROR] monitor=${monitorId}:`, err.message));
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

export { scheduleMonitorWithInterval as scheduleMonitor };