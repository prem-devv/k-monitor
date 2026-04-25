import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { scheduleMonitorWithInterval, cancelMonitorSchedule } from '../services/scheduler.js';
const createMonitorSchema = z.object({
    name: z.string().min(1),
    type: z.enum(['http', 'tcp', 'icmp']),
    url: z.string().min(1),
    port: z.number().optional(),
    interval: z.number().min(30).max(3600).default(60),
    timeout: z.number().min(5).max(30).default(10),
    keyword: z.string().optional(),
    expectedStatus: z.number().min(100).max(599).optional(),
    webhookUrl: z.string().url().optional().or(z.literal('')),
    isPublic: z.boolean().default(false),
});
const updateMonitorSchema = createMonitorSchema.partial();
async function getUptimePercentage(monitorId) {
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
export async function monitorRoutes(fastify) {
    fastify.get('/monitors', async (request, reply) => {
        const monitors = await db.query.monitors.findMany({
            orderBy: (monitors, { desc }) => [desc(monitors.createdAt)],
        });
        const monitorsWithStatus = await Promise.all(monitors.map(async (monitor) => {
            const heartbeats = await db.query.heartbeats.findMany({
                where: eq(schema.heartbeats.monitorId, monitor.id),
                orderBy: (heartbeats, { desc }) => [desc(heartbeats.createdAt)],
                limit: 1,
            });
            const lastHeartbeat = heartbeats.length > 0 ? heartbeats[0] : null;
            const uptime = await getUptimePercentage(monitor.id);
            return {
                ...monitor,
                status: lastHeartbeat?.status || 'pending',
                latency: lastHeartbeat?.latency || null,
                uptime,
            };
        }));
        return reply.send(monitorsWithStatus);
    });
    fastify.get('/monitors/:id', async (request, reply) => {
        const { id } = request.params;
        const monitor = await db.query.monitors.findFirst({
            where: eq(schema.monitors.id, parseInt(id)),
        });
        if (!monitor) {
            return reply.code(404).send({ error: 'Monitor not found' });
        }
        const heartbeats = await db.query.heartbeats.findMany({
            where: eq(schema.heartbeats.monitorId, monitor.id),
            orderBy: (heartbeats, { desc }) => [desc(heartbeats.createdAt)],
            limit: 1,
        });
        const lastHeartbeat = heartbeats.length > 0 ? heartbeats[0] : null;
        const uptime = await getUptimePercentage(monitor.id);
        return reply.send({
            ...monitor,
            status: lastHeartbeat?.status || 'pending',
            latency: lastHeartbeat?.latency || null,
            uptime,
        });
    });
    fastify.post('/monitors', async (request, reply) => {
        const data = createMonitorSchema.parse(request.body);
        const now = Date.now();
        const result = await db.insert(schema.monitors).values({
            name: data.name,
            type: data.type,
            url: data.url || '',
            port: data.port || null,
            interval: data.interval,
            timeout: data.timeout,
            keyword: data.keyword || null,
            expectedStatus: data.expectedStatus || null,
            webhookUrl: data.webhookUrl || null,
            isPublic: data.isPublic,
            active: true,
            createdAt: now,
            updatedAt: now,
        }).returning();
        const monitor = result[0];
        try {
            await scheduleMonitorWithInterval(monitor.id, monitor.interval);
        }
        catch (error) {
            console.error('Failed to schedule monitor:', error);
        }
        return reply.code(201).send(monitor);
    });
    fastify.put('/monitors/:id', async (request, reply) => {
        const { id } = request.params;
        const data = updateMonitorSchema.parse(request.body);
        const existing = await db.query.monitors.findFirst({
            where: eq(schema.monitors.id, parseInt(id)),
        });
        if (!existing) {
            return reply.code(404).send({ error: 'Monitor not found' });
        }
        await db.update(schema.monitors)
            .set({ ...data, updatedAt: Date.now() })
            .where(eq(schema.monitors.id, parseInt(id)));
        if (data.interval || data.url) {
            try {
                await cancelMonitorSchedule(parseInt(id));
                await scheduleMonitorWithInterval(parseInt(id), data.interval || existing.interval);
            }
            catch (error) {
                console.error('Failed to reschedule monitor:', error);
            }
        }
        const updated = await db.query.monitors.findFirst({
            where: eq(schema.monitors.id, parseInt(id)),
        });
        return reply.send(updated);
    });
    fastify.delete('/monitors/:id', async (request, reply) => {
        const { id } = request.params;
        const existing = await db.query.monitors.findFirst({
            where: eq(schema.monitors.id, parseInt(id)),
        });
        if (!existing) {
            return reply.code(404).send({ error: 'Monitor not found' });
        }
        try {
            await cancelMonitorSchedule(parseInt(id));
        }
        catch (error) {
            console.error('Failed to cancel monitor schedule:', error);
        }
        await db.delete(schema.monitors).where(eq(schema.monitors.id, parseInt(id)));
        return reply.code(204).send();
    });
    fastify.get('/monitors/:id/heartbeats', async (request, reply) => {
        const { id } = request.params;
        const { limit = '1440' } = request.query;
        const heartbeats = await db.query.heartbeats.findMany({
            where: eq(schema.heartbeats.monitorId, parseInt(id)),
            orderBy: (heartbeats, { desc }) => [desc(heartbeats.createdAt)],
            limit: parseInt(limit) || 1440,
        });
        return reply.send(heartbeats);
    });
}
