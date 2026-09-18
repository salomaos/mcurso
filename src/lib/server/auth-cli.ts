import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

// Config mínima usada APENAS pelo CLI (@better-auth/cli) para gerar auth-schema.ts.
const dbPath = process.env.DB_PATH ?? 'data/mcurso.db';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = drizzle(new Database(dbPath));

export const auth = betterAuth({
	basePath: '/api/auth',
	database: drizzleAdapter(db, { provider: 'sqlite' }),
	emailAndPassword: { enabled: true }
});