import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Table, getTableColumns, getTableName, is } from 'drizzle-orm';
import { describe, it, expect } from 'vitest';
import * as mysql from './mysql';
import * as postgres from './postgres';
import * as sqlite from './sqlite';
import * as authMysql from '../auth-schema/mysql';
import * as authPostgres from '../auth-schema/postgres';
import * as authSqlite from '../auth-schema/sqlite';

// `index.ts` faz o app inteiro ser escrito contra o schema do SQLite, e essa
// escolha só é segura enquanto as três variantes tiverem a mesma forma. Os
// guardas `Igual<>` daquele arquivo cobrem os *tipos* em tempo de compilação;
// este arquivo cobre o que o compilador não vê: nomes das tabelas e das colunas,
// nulabilidade, chave primária e existência.
//
// Vale para os schemas de auth também — eles são gerados pelo `@better-auth/cli`
// (`pnpm db:auth`), um por dialeto, e uma geração que saísse pela metade
// deixaria o login quebrado em produção sem nenhum erro de compilação.

const NOMES = ['apostilas', 'secoes', 'aulas', 'anexos', 'exercicios'] as const;
const NOMES_AUTH = ['user', 'session', 'account', 'verification'] as const;

const APP = { sqlite, postgres, mysql } as const;
const AUTH = { sqlite: authSqlite, postgres: authPostgres, mysql: authMysql } as const;

type Coluna = { notNull: boolean; primary: boolean; hasDefault: boolean };
type Forma = { tabela: string; colunas: Record<string, Coluna> };

/** Descreve a "forma" de uma tabela, ignorando o que só existe num dialeto. */
function forma(tabela: unknown): Forma {
	const colunas = getTableColumns(tabela as never) as Record<string, unknown>;
	const descritas: Record<string, Coluna> = {};

	for (const [chave, coluna] of Object.entries(colunas)) {
		const c = coluna as unknown as Coluna;
		descritas[chave] = {
			notNull: Boolean(c.notNull),
			primary: Boolean(c.primary),
			hasDefault: Boolean(c.hasDefault)
		};
	}

	return { tabela: getTableName(tabela as never), colunas: descritas };
}

/** Só as tabelas: os arquivos de auth também exportam os `*Relations`. */
function tabelasDo(modulo: object): string[] {
	return Object.keys(modulo)
		.filter((chave) => is((modulo as Record<string, unknown>)[chave], Table))
		.sort();
}

/** Compara cada tabela de um dialeto com a do SQLite, que é a referência. */
function conferirParidade(nomes: readonly string[], modulos: typeof APP | typeof AUTH) {
	for (const nome of nomes) {
		const referencia = forma(modulos.sqlite[nome as keyof typeof modulos.sqlite]);

		for (const [dialeto, modulo] of Object.entries(modulos)) {
			if (dialeto === 'sqlite') continue;
			const atual = forma((modulo as Record<string, unknown>)[nome]);
			expect(
				atual,
				`${nome} divergiu entre sqlite e ${dialeto} — o app é tipado pelo do SQLite, então precisam casar`
			).toEqual(referencia);
		}

		// Fecha a paridade por ausência: uma tabela que existisse só num dialeto
		// passaria despercebida na comparação acima.
		for (const modulo of Object.values(modulos)) {
			expect(tabelasDo(modulo)).toEqual([...nomes].sort());
		}
	}
}

describe('paridade entre os dialects do schema do app', () => {
	it('as cinco tabelas têm a mesma forma nos três', () => {
		conferirParidade(NOMES, APP);
	});

	it('o nome de origem da tabela é o próprio nome da constante', () => {
		for (const nome of NOMES) {
			expect(forma(sqlite[nome]).tabela).toBe(nome);
		}
	});
});

describe('paridade entre os dialects do schema de auth', () => {
	it('as quatro tabelas têm a mesma forma nos três', () => {
		conferirParidade(NOMES_AUTH, AUTH);
	});
});

describe('auth-schema usa o core do próprio dialect', () => {
	// Regressão do `@better-auth/cli` caindo silenciosamente no SQLite quando não
	// conseguia ler a config: os três arquivos saíam idênticos, com `sqliteTable`,
	// e o PostgreSQL/MySQL ficavam sem tabelas de login. Lê o arquivo em vez do
	// módulo porque o erro está justamente no `import`.
	const ESPERADO = {
		sqlite: /from "drizzle-orm\/sqlite-core"/,
		postgres: /from "drizzle-orm\/pg-core"/,
		mysql: /from "drizzle-orm\/mysql-core"/
	} as const;

	it.each(Object.keys(ESPERADO) as (keyof typeof ESPERADO)[])(
		'%s.ts importa do core do seu dialeto',
		(dialeto) => {
			const dir = path.dirname(fileURLToPath(import.meta.url));
			const texto = readFileSync(path.join(dir, '..', 'auth-schema', `${dialeto}.ts`), 'utf8');
			expect(texto).toMatch(ESPERADO[dialeto]);
		}
	);
});
