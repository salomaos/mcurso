export const SENHA_E2E = process.env.E2E_MASTER_PASSWORD ?? 'mestradee2e';
export const DB_E2E = process.env.E2E_DB_PATH ?? 'data/e2e.db';
export const UPLOADS_E2E = process.env.E2E_UPLOADS_DIR ?? 'data/e2e-uploads';
export const EMAIL_E2E = process.env.E2E_MASTER_EMAIL ?? 'e2e@mcurso.local';
export const SEGREDO_E2E = process.env.E2E_AUTH_SECRET ?? 'e2e-secret';

// A suíte roda no SQLite por padrão. Com `E2E_DIALECT=mysql` (e um MariaDB em
// `E2E_DB_URL`) roda a **mesma** suíte contra o outro dialeto — é isso que valida
// o dual-dialect de verdade. O banco precisa terminar em `_e2e`: o reset recusa
// apagar qualquer outro nome.
export const DIALETO_E2E = process.env.E2E_DIALECT ?? 'sqlite';
export const DB_URL_E2E =
	process.env.E2E_DB_URL ?? 'mysql://root:mcurso@127.0.0.1:3307/mcurso_e2e';
