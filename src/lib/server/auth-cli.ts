import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle as drizzleMySql } from 'drizzle-orm/mysql2';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { createPool } from 'mysql2/promise';
import { Pool } from 'pg';
import { PROVEDOR, caminhoSqlite, urlDoBanco } from './db/driver';

// Config mínima do Better Auth usada **só** pelo `@better-auth/cli`, para escrever
// o schema de autenticação do dialeto escolhido em `db/auth-schema/<dialeto>.ts`
// (ver `pnpm db:auth`). Não é o auth do runtime, que está em `auth.ts`.
//
// Os imports são estáticos de propósito: este arquivo nunca entra no bundle do
// app, e assim o `betterAuth()` continua síncrono como a lib espera.

function banco() {
	if (PROVEDOR === 'pg') return drizzlePg(new Pool({ connectionString: urlDoBanco()! }));
	if (PROVEDOR === 'mysql')
		return drizzleMySql(createPool({ uri: urlDoBanco()!, connectionLimit: 1 }));

	// O CLI abre o arquivo mesmo sem chegar a consultar: o path do SQLite é
	// relativo ao cwd, então o arquivo nasce em `data/`.
	const arquivo = caminhoSqlite();
	fs.mkdirSync(path.dirname(arquivo), { recursive: true });
	return drizzleSqlite(new Database(arquivo));
}

export const auth = betterAuth({
	basePath: '/api/auth',
	database: drizzleAdapter(banco(), { provider: PROVEDOR }),
	emailAndPassword: { enabled: true }
});
