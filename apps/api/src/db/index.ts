import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'k-monitor.db');
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

// Basic initialization if tables don't exist
const tableExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='monitors'").get();
if (!tableExists) {
  const initSqlPath = path.join(process.cwd(), '../../init.sql');
  const altInitSqlPath = '/app/init.sql';
  
  try {
    const finalPath = fs.existsSync(initSqlPath) ? initSqlPath : altInitSqlPath;
    if (fs.existsSync(finalPath)) {
      console.log(`Initializing database with ${finalPath}`);
      const sql = fs.readFileSync(finalPath, 'utf8');
      sqlite.exec(sql);
    }
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }
}

export const db = drizzle(sqlite, { schema });

export { schema };