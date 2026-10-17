import fs from 'node:fs';

// Os testes E2E rodam sempre contra um banco descartável, recriado do zero a cada
// execução — o app migra no boot, então é o mesmo caminho do deploy. No dialeto
// SQLite isso é apagar os arquivos; no MySQL/MariaDB é dropar e recriar o banco.
const dialeto = process.env.DB_DIALECT === 'mysql' ? 'mysql' : 'sqlite';
const db = process.env.E2E_DB_PATH ?? 'data/e2e.db';
const uploads = process.env.E2E_UPLOADS_DIR ?? 'data/e2e-uploads';

for (const alvo of [db, `${db}-shm`, `${db}-wal`, uploads]) {
	fs.rmSync(alvo, { force: true, recursive: true });
}

if (dialeto === 'sqlite') process.exit(0);

const url = process.env.DB_URL;
if (!url) throw new Error('DB_DIALECT=mysql exige DB_URL (o webServer monta de E2E_DB_URL).');

const { createConnection } = await import('mysql2/promise');
const alvo = new URL(url);
const banco = decodeURIComponent(alvo.pathname.replace(/^\//, ''));

// Trava de segurança: o E2E nunca pode apontar para um banco de verdade.
if (!banco.endsWith('_e2e')) {
	throw new Error(`[e2e] recusando apagar o banco "${banco}": o nome precisa terminar em "_e2e".`);
}

const conexao = await createConnection({
	host: alvo.hostname,
	port: Number(alvo.port || 3306),
	user: decodeURIComponent(alvo.username),
	password: decodeURIComponent(alvo.password)
});
await conexao.query(`DROP DATABASE IF EXISTS \`${banco}\``);
await conexao.query(`CREATE DATABASE \`${banco}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await conexao.end();

console.log(`[mcurso] banco MySQL ${banco} recriado para o E2E`);
