import fs from 'node:fs';

const db = process.env.E2E_DB_PATH ?? 'data/e2e.db';
const uploads = process.env.E2E_UPLOADS_DIR ?? 'data/e2e-uploads';

for (const alvo of [db, `${db}-shm`, `${db}-wal`, uploads]) {
	fs.rmSync(alvo, { force: true, recursive: true });
}
