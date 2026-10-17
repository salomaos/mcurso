// Guarda os dois pares de schema (SQLite e MySQL) contra divergência: o app
// escreve uma consulta só e ela precisa valer nos dois dialetos. O que é
// comparado é o **contrato** — nomes de tabela e as chaves JS das colunas, que é
// o que o código acessa (`aula.blocos`, `user.emailVerified`) —, nunca os tipos,
// que divergem de propósito (`text` vs `varchar`, `integer` timestamp vs
// `datetime`, `mode: 'json'` vs `json`).

import { getTableColumns, getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import * as authMysql from './auth-schema.mysql';
import * as authSqlite from './auth-schema';
import * as mysqlSchema from './schema.mysql';
import * as sqliteSchema from './schema';

function contrato(modulo: object): Map<string, string[]> {
	const tabelas = new Map<string, string[]>();
	for (const valor of Object.values(modulo) as Record<string, unknown>[]) {
		// `getTableName` devolve undefined para o que não é tabela (os `relations`).
		const nome = getTableName(valor as never);
		if (!nome) continue;
		const colunas = getTableColumns(valor as never);
		if (!colunas) continue;
		tabelas.set(nome, Object.keys(colunas).sort());
	}
	return tabelas;
}

const pares: [string, object, object][] = [
	['schema', sqliteSchema, mysqlSchema],
	['auth-schema', authSqlite, authMysql]
];

describe.each(pares)('paridade do %s entre SQLite e MySQL', (_rotulo, sqlite, mysql) => {
	const doSqlite = contrato(sqlite);
	const doMysql = contrato(mysql);

	it('tem as mesmas tabelas', () => {
		expect(doSqlite.size).toBeGreaterThan(0);
		expect([...doMysql.keys()].sort()).toEqual([...doSqlite.keys()].sort());
	});

	it('tem as mesmas colunas em cada tabela', () => {
		for (const [tabela, colunas] of doSqlite) {
			expect(doMysql.get(tabela), `tabela ${tabela}`).toEqual(colunas);
		}
	});
});
