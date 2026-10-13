import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as authSchema from './auth-schema';
import { aplicarMigrations } from './migrar';
import { abrirBanco } from './node-sqlite';
import * as schema from './schema';

const dbPath = process.env.DB_PATH ?? 'data/mcurso.db';

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// O `sqlite` é um `DatabaseSync` do node:sqlite (SQLite embutido do Node) com um
// shim de `transaction`; tipado como better-sqlite3 para o driver do drizzle
// aceitar. Ver `node-sqlite.ts` para o porquê — deploy sem nativo.
const sqlite = abrirBanco(dbPath);

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