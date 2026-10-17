import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2';

// Config mínima usada APENAS pelo CLI (@better-auth/cli) para gerar o
// `auth-schema.mysql.ts` — o gêmeo MySQL do `auth-schema.ts` (gerado pelo
// `auth-cli.ts`). Não é o auth do runtime (ver `auth.ts`).
//
// Não conecta no banco: o CLI só lê o `provider` do adapter para escolher o
// dialeto do schema, e o `createConnection` do mysql2 é preguiçoso.
const db = drizzle(mysql.createConnection({ host: '127.0.0.1' }));

export const auth = betterAuth({
	basePath: '/api/auth',
	database: drizzleAdapter(db, { provider: 'mysql' }),
	emailAndPassword: { enabled: true }
});
