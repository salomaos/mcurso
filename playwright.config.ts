import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
import {
	DB_E2E,
	DB_URL_E2E,
	DIALETO_E2E,
	EMAIL_E2E,
	SEGREDO_E2E,
	SENHA_E2E,
	UPLOADS_E2E
} from './e2e/ambiente';

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
		// O reset vem **antes** do build de propósito: o `analyse` do pós-build do
		// SvelteKit importa o módulo do servidor, que abre a conexão e aplica as
		// migrations — no MySQL o build falha com `ER_BAD_DB_ERROR` se o banco ainda
		// não existir (e o reset é justamente quem o cria).
		command: `node scripts/e2e-reset.mjs && pnpm build && node build`,
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
			// `DB_DIALECT=mysql` (E2E_DIALECT) roda a mesma suíte contra MySQL/MariaDB;
			// `DB_PATH` continua no env porque o dialeto é escolha de runtime.
			DB_DIALECT: DIALETO_E2E,
			DB_PATH: DB_E2E,
			DB_URL: DB_URL_E2E,
			UPLOADS_DIR: UPLOADS_E2E,
			// O adapter corta o corpo em 512K por padrão, bem abaixo do limite de upload do
			// app (10 MB): o E2E roda com o mesmo valor documentado para o deploy.
			BODY_SIZE_LIMIT: '12M'
		}
	}
});
