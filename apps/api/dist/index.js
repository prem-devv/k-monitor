import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { monitorRoutes } from './routes/monitors.js';
import { statusRoutes } from './routes/status.js';
import { createWorker } from './workers/monitoring.js';
const fastify = Fastify({
    logger: true,
});
async function start() {
    try {
        await fastify.register(cors, {
            origin: true,
        });
        await fastify.register(swagger, {
            openapi: {
                info: {
                    title: 'K-Monitor API',
                    version: '1.0.0',
                },
            },
        });
        await fastify.register(swaggerUi, {
            routePrefix: '/docs',
        });
        fastify.get('/health', async () => {
            return { status: 'ok', timestamp: Date.now() };
        });
        await fastify.register(monitorRoutes, { prefix: '/api' });
        await fastify.register(statusRoutes, { prefix: '/api' });
        fastify.get('*', async (request, reply) => {
            return reply.code(404).send({ error: 'Not found' });
        });
        try {
            const worker = createWorker();
            console.log('Monitoring worker started');
        }
        catch (error) {
            console.warn('Monitoring worker not started (Redis not available):', error);
        }
        const port = parseInt(process.env.PORT || '3001');
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`Server running at http://localhost:${port}`);
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
start();
