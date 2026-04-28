CREATE TABLE IF NOT EXISTS `monitors` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `type` text DEFAULT 'http' NOT NULL,
  `url` text NOT NULL,
  `port` integer,
  `interval` integer DEFAULT 60 NOT NULL,
  `timeout` integer DEFAULT 10 NOT NULL,
  `keyword` text,
  `expected_status` integer,
  `webhook_url` text,
  `is_public` integer DEFAULT false,
  `active` integer DEFAULT true,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `heartbeats` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `monitor_id` integer NOT NULL,
  `status` text NOT NULL,
  `latency` real,
  `message` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `settings` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `key` text NOT NULL,
  `value` blob
);
CREATE UNIQUE INDEX IF NOT EXISTS `settings_key_unique` ON `settings` (`key`);
