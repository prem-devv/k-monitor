import { Queue } from 'bullmq';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
const queue = new Queue('monitoring', {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    },
});
export async function scheduleMonitor(monitorId) {
    const monitor = await db.query.monitors.findFirst({
        where: eq(schema.monitors.id, monitorId),
    });
    if (!monitor || !monitor.active)
        return;
    await queue.add('check', {
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
    const monitors = await db.query.monitors.findMany({
        where: eq(schema.monitors.active, true),
    });
    for (const monitor of monitors) {
        await scheduleMonitor(monitor.id);
    }
}
export async function scheduleMonitorWithInterval(monitorId, intervalSeconds) {
    const monitor = await db.query.monitors.findFirst({
        where: eq(schema.monitors.id, monitorId),
    });
    if (!monitor || !monitor.active)
        return;
    const intervalMs = (intervalSeconds || monitor.interval) * 1000;
    await queue.add('check', {
        monitorId: monitor.id,
        type: monitor.type,
        url: monitor.url,
        port: monitor.port,
        timeout: monitor.timeout,
        keyword: monitor.keyword,
        expectedStatus: monitor.expectedStatus,
    }, {
        delay: intervalMs,
        repeat: {
            every: intervalMs,
        },
    });
}
export async function cancelMonitorSchedule(monitorId) {
    try {
        const jobs = await queue.getJobs(['delayed', 'waiting', 'active']);
        for (const job of jobs) {
            if (job.data?.monitorId === monitorId) {
                await job.remove();
            }
        }
    }
    catch (error) {
        console.error('Failed to cancel monitor schedule:', error);
    }
}
export async function getUptimePercentage(monitorId) {
    const heartbeats = await db.query.heartbeats.findMany({
        where: eq(schema.heartbeats.monitorId, monitorId),
    });
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
    const recentHeartbeats = heartbeats.filter(h => h.createdAt > cutoffTime);
    if (recentHeartbeats.length === 0)
        return 100;
    const upCount = recentHeartbeats.filter(h => h.status === 'up').length;
    return (upCount / recentHeartbeats.length) * 100;
}
export { Queue };
