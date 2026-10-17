import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Gêmeo MySQL do `drizzle.config.ts`. As migrations vão para `drizzle-mysql/`
// (a pasta `drizzle/` é do SQLite) e a conexão vem de `DB_URL`
// (`mysql://usuario:senha@host:porta/banco`). O app migra no boot, então isto só
// vale para gerar a migration e para aplicar à mão.
export default defineConfig({
	schema: ['./src/lib/server/db/schema.mysql.ts', './src/lib/server/db/auth-schema.mysql.ts'],
	out: './drizzle-mysql',
	dialect: 'mysql',
	dbCredentials: {
		url: process.env.DB_URL ?? 'mysql://root@127.0.0.1:3306/mcurso'
	},
	strict: true,
	verbose: true
});
