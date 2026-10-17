import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzleMysql } from 'drizzle-orm/mysql2';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import mysql from 'mysql2/promise';
import * as authSchemaSqlite from './auth-schema';
import * as authSchemaMysql from './auth-schema.mysql';
import { aplicarMigrations, type DialetoBanco } from './migrar';
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
// contra os dois dialetos (ver AGENTS.md). Dentro de transação o corpo tem duas
// versões — `.run()` no SQLite, `await` no MySQL —, ver `transacao.ts`.
type Banco = BetterSQLite3Database<typeof schemaSqlite>;

function logarBanco(onde: string, pasta: string, aplicadas: number): void {
	console.log(
		aplicadas > 0
			? `[mcurso] ${aplicadas} migração(ões) aplicada(s) em ${onde} (${pasta})`
			: `[mcurso] banco em dia em ${onde} (${pasta})`
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
	logarBanco(dbPath, pasta, aplicadas);

	return db;
}

async function abrirMysql(): Promise<Banco> {
	const url = process.env.DB_URL;

	if (!url) {
		throw new Error(
			'[mcurso] DB_DIALECT=mysql exige DB_URL (ex.: mysql://usuario:senha@host:3306/banco).'
		);
	}

	const cliente = await mysql.createConnection(url);
	const db = drizzleMysql(cliente, {
		// `mode: 'default'` é o MySQL/MariaDB comum (sem o proxy do PlanetScale).
		mode: 'default',
		schema: { ...authSchemaMysql, ...schemaMysql }
	});
	const { pasta, aplicadas } = await aplicarMigrations(db, 'mysql');
	// A senha da URL não vai para o log.
	logarBanco(url.replace(/\/\/[^@/]*@/, '//***@'), pasta, aplicadas);

	return db as unknown as Banco;
}

// Sem `await` de topo aqui o `db` exportado seria uma promise e todo consumidor
// teria que esperar; com ele, quem importa este módulo só executa depois de o
// banco estar aberto e migrado — que é o contrato que o boot sempre teve.
export const db = dialeto === 'mysql' ? await abrirMysql() : await abrirSqlite();

export const uploadsDir =
	process.env.UPLOADS_DIR ?? path.resolve(process.cwd(), 'data/uploads');
