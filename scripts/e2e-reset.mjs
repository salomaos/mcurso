import fs from 'node:fs';
// `mysql2/promise` e não `mysql2`: este script dá `await` em `pool.query()`, e a
// API de callback devolve um `Query` que não é promise (lança "You have tried to
// call .then()..."). O subpath funciona aqui porque o script roda direto no Node,
// fora do bundle do Vite.
import { createPool } from 'mysql2/promise';
import { Client } from 'pg';

// Zera o banco do E2E antes de cada execução. Roda na mesma linha do
// `webServer` do Playwright, então recebe as mesmas variáveis por `env`.
//
// A suíte roda nos três dialetos (`E2E_DB_PROVIDER`): o SQLite é o arquivo
// deletado, e nos outros dois o schema é derrubado e recriado. Apagar o schema
// inteiro — em vez de truncar tabela por tabela — é o que garante que o teste
// começa igual a um banco novo, já que a migração só roda uma vez.

const provedor = (process.env.E2E_DB_PROVIDER ?? 'sqlite').trim().toLowerCase();
const uploads = process.env.E2E_UPLOADS_DIR ?? 'data/e2e-uploads';

fs.rmSync(uploads, { force: true, recursive: true });

if (provedor === 'pg') {
	await zerarPostgres();
} else if (provedor === 'mysql') {
	await zerarMySql();
} else {
	const db = process.env.E2E_DB_PATH ?? 'data/e2e.db';
	for (const alvo of [db, `${db}-shm`, `${db}-wal`]) {
		fs.rmSync(alvo, { force: true, recursive: true });
	}
	console.log('[mcurso] e2e: sqlite apagado');
}

async function zerarPostgres() {
	const url = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;
	if (!url) throw new Error('[mcurso] e2e: E2E_DB_PROVIDER=pg sem E2E_DATABASE_URL');

	const client = new Client({ connectionString: url });
	await client.connect();

	// O schema de migrations do drizzle vive em `drizzle`, **fora** do `public`.
	// Derrubar só o `public` deixava a linha de controle da migration anterior, e o
	// app pulava tudo no boot seguinte (o drizzle compara o `created_at` gravado
	// com o `when` do journal) — resultado: banco vazio sem erro nenhum.
	await client.query('drop schema if exists drizzle cascade;');
	await client.query('drop schema if exists public cascade; create schema public;');
	await client.end();

	console.log(`[mcurso] e2e: schema public recriado em ${semSenha(url)}`);
}

async function zerarMySql() {
	const url = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;
	if (!url) throw new Error('[mcurso] e2e: E2E_DB_PROVIDER=mysql sem E2E_DATABASE_URL');

	const alvo = new URL(url);
	const nome = decodeURIComponent(alvo.pathname.replace(/^\//, ''));
	if (!nome) throw new Error('[mcurso] e2e: DATABASE_URL do mysql sem nome de banco');

	const pool = createPool({
		host: alvo.hostname,
		port: Number(alvo.port || 3306),
		user: decodeURIComponent(alvo.username),
		password: decodeURIComponent(alvo.password)
	});

	const [bancos] = await pool.query('show databases');
	const existe = bancos.some((b) => Object.values(b)[0] === nome);

	if (existe) await pool.query(`drop database \`${nome}\``);
	await pool.query(`create database \`${nome}\` character set utf8mb4 collate utf8mb4_unicode_ci`);
	await pool.end();

	console.log(`[mcurso] e2e: banco ${nome} recriado`);
}

function semSenha(url) {
	const alvo = new URL(url);
	return `${alvo.protocol}//${alvo.host}${alvo.pathname}`;
}
