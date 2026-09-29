import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle as drizzleMySql } from 'drizzle-orm/mysql2';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { createPool } from 'mysql2/promise';
import type { Pool as PromisePool } from 'mysql2/promise';
import { Pool as PgPool } from 'pg';
import { caminhoSqlite, type Provedor, urlDoBanco } from './driver';
import * as authSchema from './auth-schema';
import * as schemaPostgres from './schema/postgres';
import * as schemaMySql from './schema/mysql';
import * as schemaSqlite from './schema/sqlite';

// A conexão é criada **sem cast**: cada dialeto devolve o seu tipo de verdade,
// para o `migrator` e as queries do boot receberem a instância concreta. O cast
// para o tipo do app acontece em `index.ts`, um único lugar.

export type Bruto =
	| { provedor: 'sqlite'; db: BetterSQLite3Database<typeof schemaSqlite>; bruto: Database.Database }
	| { provedor: 'pg'; db: NodePgDatabase<typeof schemaPostgres>; bruto: PgPool }
	| { provedor: 'mysql'; db: MySql2Database<typeof schemaMySql>; bruto: PromisePool };

function sqlite(): Bruto {
	const arquivo = caminhoSqlite();
	fs.mkdirSync(path.dirname(arquivo), { recursive: true });

	const handle = new Database(arquivo);
	// WAL: leituras não bloqueiam a escrita, que é o caso do app (a listagem
	// pública de apostilas/aulas roda enquanto o professor salva).
	handle.pragma('journal_mode = WAL');
	// `foreign_keys` fica de fora de propósito: o SQLite não liga a pragma por
	// padrão e o app apaga seção/apostila por conta própria (ver AGENTS.md). Nos
	// outros dois dialetos a FK vale, e as ações manuais viram redundantes —
	// inofensivas, e é o que o E2E dos três confere.

	return {
		provedor: 'sqlite',
		bruto: handle,
		db: drizzleSqlite(handle, { schema: { ...authSchema, ...schemaSqlite } })
	};
}

function postgres(): Bruto {
	const pool = new PgPool({ connectionString: urlDoBanco('pg')! });
	return {
		provedor: 'pg',
		bruto: pool,
		db: drizzlePg(pool, { schema: { ...authSchema, ...schemaPostgres } })
	};
}

function mysql(): Bruto {
	// O pool é o de `mysql2/promise`: o drizzle-orm/mysql2 dá `await` no retorno de
	// `query()`, e a API de callback do mysql2 devolve um `Query` que não é
	// promise (lança "You have tried to call .then()...").
	const pool = createPool({
		uri: urlDoBanco('mysql')!,
		// O `TIMESTAMP` do MySQL é convertido no fuso do servidor. Fixar os dois
		// lados em UTC é o que impede a data de voltar deslocada quando o app roda
		// em UTC e o banco em outro fuso (ou o contrário) — o `createdAt` que
		// ordena a listagem de apostilas viraria data de outro dia.
		timezone: 'Z',
		connectionLimit: 5
	});
	// Vale para toda conexão do pool, inclusive as que o drizzle abrir depois.
	// O evento vem do pool por baixo, então entrega a conexão da API de
	// **callback**: dar `await`/`catch` no retorno dela quebra ("You have tried to
	// call .then()..."). O `promise()` é o que embrulha para a interface correta.
	pool.on('connection', (conexao) => {
		conexao
			.promise()
			.query("SET time_zone = '+00:00'")
			.catch((erro: unknown) => {
				console.error('[mcurso] não foi possível fixar o fuso da conexão MySQL', erro);
			});
	});

	return {
		provedor: 'mysql',
		bruto: pool,
		// `mode` é obrigatório no drizzle-orm/mysql2: `default` para o MySQL
		// comum, `planetscale` para o driver em que o `insertId` não vem.
		db: drizzleMySql(pool, { mode: 'default', schema: { ...authSchema, ...schemaMySql } })
	};
}

export function criarConexao(provedor: Provedor): Bruto {
	if (provedor === 'pg') return postgres();
	if (provedor === 'mysql') return mysql();
	return sqlite();
}
