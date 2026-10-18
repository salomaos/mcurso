import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzleMysql } from 'drizzle-orm/mysql2';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { dev, building } from '$app/environment';
import mysql from 'mysql2/promise';
import { conferirUploads, formatarMb, LIMITE_UPLOAD_BYTES } from '$lib/server/uploads';
import * as authSchemaSqlite from './auth-schema';
import * as authSchemaMysql from './auth-schema.mysql';
import { aplicarMigrations, contarTabelas, type DialetoBanco } from './migrar';
import { abrirBanco } from './node-sqlite';
import * as schemaSqlite from './schema';
import * as schemaMysql from './schema.mysql';

// O dialeto é uma decisão de **deploy**, lida de `DB_DIALECT` (default `sqlite`):
// o dev e o E2E rodam SQLite; a hospedagem roda MySQL/MariaDB. Os dois dialetos
// convivem no mesmo código-fonte — quem escolhe é esta constante.
export const dialeto: DialetoBanco = process.env.DB_DIALECT === 'mysql' ? 'mysql' : 'sqlite';

// O app inteiro é escrito contra o tipo do SQLite: cada consulta existe (com
// pequenas diferenças) nos dois dialetos, e trocar `db` por uma união quebraria
// todo o encadeamento do drizzle. Então a instância MySQL entra por cast e o que
// sustenta a escolha não é o tipo, e sim a suíte E2E rodando a **mesma** suíte
// contra os dois dialetos (ver AGENTS.md). As consultas são neutras (sempre
// `await`, nunca `.run()`/`.all()`, que só existem no SQLite) e o corpo da
// transação é um só — ver `transacao.ts`.
type Banco = BetterSQLite3Database<typeof schemaSqlite>;

function logarBanco(onde: string, pasta: string, aplicadas: number, tabelas: number): void {
	console.log(
		(aplicadas > 0
			? `[mcurso] ${aplicadas} migração(ões) aplicada(s) em ${onde} (${pasta})`
			: `[mcurso] banco em dia em ${onde} (${pasta})`) + ` — ${tabelas} tabela(s)`
	);
}

// O boot confere que as migrações criaram alguma coisa. `__drizzle_migrations` pode
// dizer que está tudo migrado num banco **sem tabela nenhuma** (basta o controle ter
// sobrado de um banco recriado): aí o drizzle pula tudo em silêncio, o log mente
// "banco em dia" e toda consulta falha com "Failed query: ..." sem dizer por quê.
// Parar o boot com a instrução é melhor do que subir um app que só dá 500 — e a
// contagem no log já separa "o banco tem 11 tabelas" de "o banco não tem nada".
function conferirTabelas(onde: string, tabelas: number): void {
	if (tabelas > 1) return;

	throw new Error(
		`[mcurso] ${onde} não tem tabela nenhuma além do controle de migração: o banco está ` +
			'vazio, mas o drizzle registrou as migrações como aplicadas e por isso não criou nada. ' +
			'Apague a tabela "__drizzle_migrations" no banco e suba o app de novo, que as ' +
			'migrações rodam do zero.'
	);
}

async function abrirSqlite(): Promise<Banco> {
	const dbPath = process.env.DB_PATH ?? 'data/mcurso.db';
	fs.mkdirSync(path.dirname(dbPath), { recursive: true });

	// O `sqlite` é um `DatabaseSync` do node:sqlite (SQLite embutido do Node) com um
	// shim de `transaction`; tipado como better-sqlite3 para o driver do drizzle
	// aceitar. Ver `node-sqlite.ts` para o porquê — deploy sem nativo.
	const sqlite = abrirBanco(dbPath);
	const db = drizzleSqlite(sqlite, { schema: { ...authSchemaSqlite, ...schemaSqlite } });

	// Roda antes de qualquer consulta (este módulo é importado pelo `auth`, que o
	// `hooks.server.ts` carrega no boot): o deploy não precisa de passo extra de migrate.
	const { pasta, aplicadas } = await aplicarMigrations(db, 'sqlite');
	const tabelas = await contarTabelas(db, 'sqlite');
	conferirTabelas(dbPath, tabelas);
	logarBanco(dbPath, pasta, aplicadas, tabelas);

	return db;
}

async function abrirMysql(): Promise<Banco> {
	const url = process.env.DB_URL;

	if (!url) {
		throw new Error(
			'[mcurso] DB_DIALECT=mysql exige DB_URL (ex.: mysql://usuario:senha@host:3306/banco).'
		);
	}

	// **Pool, nunca `createConnection`**: em hospedagem compartilhada o servidor
	// derruba a conexão parada no `wait_timeout` e uma conexão única **nunca** se
	// recupera — a partir daí toda consulta falha com "Failed query: ..." (o erro do
	// drizzle esconde a causa, então o sintoma é 500 em tudo até reiniciar o
	// processo; foi exatamente o que derrubou o deploy de 18/10/2026). O pool
	// descarta a conexão morta assim que o socket fecha e abre outra na consulta
	// seguinte. As transações continuam numa conexão só: o `db.transaction` do
	// drizzle pega uma conexão dedicada do pool e a devolve no fim (ver
	// `transacao.ts`).
	const cliente = mysql.createPool({
		uri: url,
		connectionLimit: 10,
		// Fecha a conexão ociosa antes de o servidor fazer o mesmo — é a recomendação
		// do mysql2 (`maxIdle`/`idleTimeout`) para não segurar conexão que o host já
		// considera morta.
		maxIdle: 2,
		idleTimeout: 60_000,
		enableKeepAlive: true,
		keepAliveInitialDelay: 0,
		waitForConnections: true,
		queueLimit: 0
	});
	const db = drizzleMysql(cliente, {
		// `mode: 'default'` é o MySQL/MariaDB comum (sem o proxy do PlanetScale).
		mode: 'default',
		schema: { ...authSchemaMysql, ...schemaMysql }
	});
	const { pasta, aplicadas } = await aplicarMigrations(db, 'mysql');
	const tabelas = await contarTabelas(db, 'mysql');
	// A senha da URL não vai para o log.
	const onde = url.replace(/\/\/[^@/]*@/, '//***@');
	conferirTabelas(onde, tabelas);
	logarBanco(onde, pasta, aplicadas, tabelas);

	return db as unknown as Banco;
}

// Sem `await` de topo aqui o `db` exportado seria uma promise e todo consumidor
// teria que esperar; com ele, quem importa este módulo só executa depois de o
// banco estar aberto e migrado — que é o contrato que o boot sempre teve.
export const db = dialeto === 'mysql' ? await abrirMysql() : await abrirSqlite();

// A pasta de uploads é diagnóstico de boot igual ao do banco: o caminho resolvido aparece
// no log e, em produção, um caminho relativo (ou um `BODY_SIZE_LIMIT` menor que o limite do
// app) vira aviso — é o que separa "configuração errada" de "o arquivo sumiu no deploy".
const uploads = conferirUploads({
	valor: process.env.UPLOADS_DIR,
	cwd: process.cwd(),
	dev,
	bodySizeLimit: process.env.BODY_SIZE_LIMIT
});

export const uploadsDir = uploads.caminho;

// O build também importa este módulo (o `analyse` do SvelteKit roda no pós-build) e ali o
// ambiente é o do build, não o da subida: avisar nessa hora seria ruído. Só quem serve loga.
if (!building) {
	console.log(`[mcurso] uploads em ${uploadsDir} (limite ${formatarMb(LIMITE_UPLOAD_BYTES)} MB)`);
	for (const aviso of uploads.avisos) console.warn(`[mcurso] AVISO: ${aviso}`);
}
