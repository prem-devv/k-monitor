import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
export const monitors = sqliteTable('monitors', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    type: text('type', { enum: ['http', 'tcp', 'icmp', 'ssl', 'dns'] }).notNull().default('http'),
    url: text('url').notNull(),
    port: integer('port'),
    interval: integer('interval').notNull().default(60),
    timeout: integer('timeout').notNull().default(10),
    keyword: text('keyword'),
    expectedStatus: integer('expected_status'),
    webhookUrl: text('webhook_url'),
    maintenanceUntil: integer('maintenance_until'),
    isPublic: integer('is_public', { mode: 'boolean' }).default(false),
    active: integer('active', { mode: 'boolean' }).default(true),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
});
export const heartbeats = sqliteTable('heartbeats', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    monitorId: integer('monitor_id').notNull().references(() => monitors.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['up', 'down'] }).notNull(),
    latency: real('latency'),
    message: text('message'),
    createdAt: integer('created_at').notNull(),
});
export const settings = sqliteTable('settings', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    key: text('key').notNull().unique(),
    value: blob('value'),
});
