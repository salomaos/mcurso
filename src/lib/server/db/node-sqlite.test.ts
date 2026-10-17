// Guarda o shim de transação do `node:sqlite` (ver `node-sqlite.ts`): a session
// do drizzle só usa `transaction(fn)[modo](tx)`. O ponto crítico é o callback
// NÃO poder ser `async` — sem a guarda, o COMMIT sairia antes de o promise
// resolver e o efeito ficaria fora da transação.

import { describe, expect, it } from 'vitest';
import { abrirBanco } from './node-sqlite';

// A superfície real é tipada como o `Database` do better-sqlite3 (para o drizzle
// aceitar); aqui só o que o teste usa é declarado, sem os genéricos do driver.
type TransacaoFalsa = {
	deferred: (arg?: unknown) => unknown;
	immediate: (arg?: unknown) => unknown;
	exclusive: (arg?: unknown) => unknown;
	default: (arg?: unknown) => unknown;
};

type BancoFalso = {
	exec: (sql: string) => void;
	prepare: (sql: string) => {
		run: (...params: unknown[]) => unknown;
		get: (...params: unknown[]) => unknown;
	};
	transaction: (fn: (arg?: unknown) => unknown) => TransacaoFalsa;
};

function novoBanco(): BancoFalso {
	const banco = abrirBanco(':memory:') as unknown as BancoFalso;
	banco.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, nome TEXT)');
	return banco;
}

function contar(banco: BancoFalso): unknown {
	return banco.prepare('SELECT count(*) AS n FROM t').get();
}

describe('shim de transação do node:sqlite', () => {
	it('commita quando o callback é síncrono', () => {
		const banco = novoBanco();
		const tx = banco.transaction(() => {
			banco.prepare('INSERT INTO t (nome) VALUES (?)').run('a');
		});

		tx.deferred();

		expect(contar(banco)).toEqual({ n: 1 });
	});

	it('lança quando o callback devolve um promise e desfaz o que já rodou', () => {
		const banco = novoBanco();
		const tx = banco.transaction(() => {
			banco.prepare('INSERT INTO t (nome) VALUES (?)').run('a');
			return Promise.resolve();
		});

		expect(() => tx.deferred()).toThrow('Transaction function cannot return a promise');
		expect(contar(banco)).toEqual({ n: 0 });
	});

	it('desfaz tudo quando o callback lança', () => {
		const banco = novoBanco();
		const tx = banco.transaction(() => {
			banco.prepare('INSERT INTO t (nome) VALUES (?)').run('a');
			throw new Error('falhou no meio');
		});

		expect(() => tx.deferred()).toThrow('falhou no meio');
		expect(contar(banco)).toEqual({ n: 0 });
	});
});
