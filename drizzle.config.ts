import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: ['./src/lib/server/db/schema.ts', './src/lib/server/db/auth-schema.ts'],
	out: './drizzle',
	dialect: 'sqlite',
	dbCredentials: {
		url: process.env.DB_PATH ?? 'data/mcurso.db'
	},
	strict: true,
	verbose: true
});