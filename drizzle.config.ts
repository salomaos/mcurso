import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Uma config só, parametrizada por `DB_PROVIDER` — o drizzle-kit carrega este
// arquivo a cada invocação, então `pnpm db:generate` gera o dialeto do `.env` e
// `pnpm db:generate:all` gera os três (ver `scripts/drizzle.mjs`).
//
// O nome do dialeto no drizzle-kit é `postgresql`, não `pg`; o `pg` só existe
// como valor de `DB_PROVIDER` para casar com o `drizzleAdapter` do Better Auth.

type Provedor = 'sqlite' | 'pg' | 'mysql';

const provedor = (process.env.DB_PROVIDER ?? 'sqlite').trim().toLowerCase() as Provedor;

const PASTA: Record<Provedor, string> = {
	sqlite: 'sqlite',
	pg: 'postgres',
	mysql: 'mysql'
};

const DIALETO: Record<Provedor, 'sqlite' | 'postgresql' | 'mysql'> = {
	sqlite: 'sqlite',
	pg: 'postgresql',
	mysql: 'mysql'
};

const pasta = PASTA[provedor];
const dialect = DIALETO[provedor];

if (!pasta || !dialect) {
	throw new Error(
		`[mcurso] DB_PROVIDER inválido no drizzle.config.ts: "${provedor}". Aceitos: sqlite, pg, mysql.`
	);
}

const credenciais =
	dialect === 'sqlite'
		? { url: process.env.DB_PATH ?? 'data/mcurso.db' }
		: { url: process.env.DATABASE_URL ?? '' };

export default defineConfig({
	schema: [
		`./src/lib/server/db/schema/${pasta}.ts`,
		`./src/lib/server/db/auth-schema/${pasta}.ts`
	],
	out: `./drizzle/${pasta}`,
	dialect,
	dbCredentials: credenciais,
	strict: true,
	verbose: true
});
