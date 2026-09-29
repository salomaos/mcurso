import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
import { DB_E2E, EMAIL_E2E, SEGREDO_E2E, SENHA_E2E, UPLOADS_E2E } from './e2e/ambiente';

const PORT = Number(process.env.E2E_PORT ?? 5179);
const baseURL = `http://localhost:${PORT}`;

// DB isolado para os testes E2E (recriado dentro do webServer e migrado pelo próprio
// app no boot, sem `drizzle-kit`). As variáveis abaixo sobrescrevem o `.env` de propósito:
// nada do ambiente de dev entra nos testes.
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
		command: `pnpm build && node scripts/e2e-reset.mjs && node build`,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		stdout: 'pipe',
		env: {
			...process.env,
			PORT: String(PORT),
			HOST: '127.0.0.1',
			ORIGIN: baseURL,
			BETTER_AUTH_URL: baseURL,
			BETTER_AUTH_SECRET: SEGREDO_E2E,
			APP_MASTER_PASSWORD: SENHA_E2E,
			APP_MASTER_EMAIL: EMAIL_E2E,
			DB_PATH: DB_E2E,
			UPLOADS_DIR: UPLOADS_E2E
		}
	}
});
