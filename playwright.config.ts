import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 5179);
const baseURL = `http://localhost:${PORT}`;

// DB isolado para os testes E2E (migrado dentro do webServer).
export default defineConfig({
	testDir: 'e2e',
	fullyParallel: false,
	workers: 1,
	timeout: 60_000,
	retries: 0,
	reporter: 'list',
	use: {
		baseURL,
		locale: 'pt-BR',
		...devices['Desktop Chrome']
	},
	webServer: {
		command: `pnpm build && pnpm exec drizzle-kit migrate && node build`,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		stdout: 'pipe',
		env: {
			...process.env,
			PORT: String(PORT),
			HOST: '127.0.0.1',
			ORIGIN: baseURL,
			BETTER_AUTH_URL: baseURL,
			BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? 'e2e-secret',
			APP_MASTER_PASSWORD: process.env.APP_MASTER_PASSWORD ?? 'mestradee2e',
			APP_MASTER_EMAIL: process.env.APP_MASTER_EMAIL ?? 'e2e@mcurso.local',
			DB_PATH: process.env.DB_PATH ?? 'data/e2e.db',
			UPLOADS_DIR: process.env.UPLOADS_DIR ?? 'data/e2e-uploads'
		}
	}
});