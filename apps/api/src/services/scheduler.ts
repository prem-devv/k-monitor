import { Queue } from 'bullmq';
import { jsonDb } from '../db/jsonDb.js';

let queueInstance: Queue | null = null;

function getQueue(): Queue {
  if (!queueInstance) {
    queueInstance = new Queue('monitoring', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });
  }
  return queueInstance;
}

export async function scheduleMonitor(monitorId: number) {
  const monitor = jsonDb.monitors.findFirst(monitorId);
  if (!monitor || !monitor.active) return;

  await getQueue().add('check', {
    monitorId: monitor.id,
    type: monitor.type,
    url: monitor.url,
    port: monitor.port,
    timeout: monitor.timeout,
    keyword: monitor.keyword,
    expectedStatus: monitor.expectedStatus,
  }, {
    delay: 0,
    removeOnComplete: true,
    removeOnFail: false,
  });
}

export async function scheduleAllMonitors() {
  const monitors = jsonDb.monitors.findMany().filter(m => m.active);
  for (const monitor of monitors) {
    await scheduleMonitorWithInterval(monitor.id, monitor.interval);
  }
}

export async function scheduleMonitorWithInterval(monitorId: number, intervalSeconds: number) {
  const monitor = jsonDb.monitors.findFirst(monitorId);
  if (!monitor || !monitor.active) return;

  const intervalMs = (intervalSeconds || monitor.interval) * 1000;

  const jobData = {
    monitorId: monitor.id,
    type: monitor.type,
    url: monitor.url,
    port: monitor.port,
    timeout: monitor.timeout,
    keyword: monitor.keyword,
    expectedStatus: monitor.expectedStatus,
  };

  await getQueue().add('check', jobData, {
    delay: 0,
    removeOnComplete: true,
    removeOnFail: false,
  });

  await getQueue().add('check', jobData, {
    repeat: {
      every: intervalMs,
    },
  });
}

export async function cancelMonitorSchedule(monitorId: number) {
  try {
    const jobs = await getQueue().getJobs(['delayed', 'waiting', 'active']);
    for (const job of jobs) {
      if (job.data?.monitorId === monitorId) {
        await job.remove();
      }
    }
  } catch (error) {
    console.error('Failed to cancel monitor schedule:', error);
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

export { Queue };