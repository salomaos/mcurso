import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as authSchema from './auth-schema';
import { aplicarMigrations } from './migrar';
import * as schema from './schema';

const dbPath = process.env.DB_PATH ?? 'data/mcurso.db';

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema: { ...authSchema, ...schema } });

// Roda antes de qualquer consulta (este módulo é importado pelo `auth`, que o
// `hooks.server.ts` carrega no boot): o deploy não precisa de passo extra de migrate.
const { pasta, aplicadas } = aplicarMigrations(db);
console.log(
	aplicadas > 0
		? `[mcurso] ${aplicadas} migração(ões) aplicada(s) em ${dbPath} (${pasta})`
		: `[mcurso] banco em dia em ${dbPath} (${pasta})`
);

export const uploadsDir =
	process.env.UPLOADS_DIR ?? path.resolve(process.cwd(), 'data/uploads');