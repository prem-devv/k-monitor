import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import axios from 'axios';
export async function statusRoutes(fastify) {
    fastify.get('/status', async (request, reply) => {
        const monitors = await db.query.monitors.findMany({
            where: eq(schema.monitors.isPublic, true),
        });
        const publicMonitors = await Promise.all(monitors.map(async (monitor) => {
            const heartbeats = await db.query.heartbeats.findMany({
                where: eq(schema.heartbeats.monitorId, monitor.id),
                orderBy: (heartbeats, { desc }) => [desc(heartbeats.createdAt)],
                limit: 1,
            });
            const lastHeartbeat = heartbeats.length > 0 ? heartbeats[0] : null;
            const uptime = await calculateUptime(monitor.id);
            return {
                id: monitor.id,
                name: monitor.name,
                type: monitor.type,
                status: lastHeartbeat?.status || 'pending',
                latency: lastHeartbeat?.latency || null,
                uptime,
                lastCheck: lastHeartbeat?.createdAt || null,
            };
        }));
        const allUp = publicMonitors.every(m => m.status === 'up');
        const anyDown = publicMonitors.some(m => m.status === 'down');
        let overallStatus = 'operational';
        if (anyDown)
            overallStatus = 'down';
        else if (publicMonitors.some(m => m.status === 'degraded'))
            overallStatus = 'degraded';
        return reply.send({
            overallStatus,
            monitors: publicMonitors,
        });
    });
    fastify.post('/webhooks/test', async (request, reply) => {
        const { url } = request.body;
        if (!url) {
            return reply.code(400).send({ error: 'URL is required' });
        }
        try {
            await axios.post(url, {
                type: 'test',
                message: 'K-Monitor webhook test',
                timestamp: Date.now(),
            });
            return reply.send({ success: true });
        }
        catch (error) {
            return reply.code(400).send({
                error: 'Webhook failed',
                message: error.message
            });
        }
    });
}
async function calculateUptime(monitorId) {
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
