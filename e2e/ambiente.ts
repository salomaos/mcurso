export const SENHA_E2E = process.env.E2E_MASTER_PASSWORD ?? 'mestradee2e';
export const DB_E2E = process.env.E2E_DB_PATH ?? 'data/e2e.db';
export const UPLOADS_E2E = process.env.E2E_UPLOADS_DIR ?? 'data/e2e-uploads';
export const EMAIL_E2E = process.env.E2E_MASTER_EMAIL ?? 'e2e@mcurso.local';
export const SEGREDO_E2E = process.env.E2E_AUTH_SECRET ?? 'e2e-secret';

// Os testes rodam nos três dialetos, escolhidos por `E2E_DB_PROVIDER`
// (padrão `sqlite`, igual ao app). `DATABASE_URL` do E2E é separado do de dev
// por variável própria: o `dotenv` não sobrescreve, então passar a URL pelo
// `env` do `webServer` é o que garante que nada do ambiente de dev vaza para
// os testes.
export const PROVEDOR_E2E = (process.env.E2E_DB_PROVIDER ?? 'sqlite').trim().toLowerCase();

const BANCO_E2E = {
	sqlite: DB_E2E,
	pg: process.env.E2E_DATABASE_URL ?? 'postgres://mcurso:mcurso@localhost:5433/mcurso_e2e',
	mysql: process.env.E2E_DATABASE_URL ?? 'mysql://mcurso:mcurso@localhost:3307/mcurso_e2e'
} as const;

export const URL_E2E = BANCO_E2E[PROVEDOR_E2E as keyof typeof BANCO_E2E];
