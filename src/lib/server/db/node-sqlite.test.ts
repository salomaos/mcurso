// Guarda o shim de transação do `node:sqlite` (ver `node-sqlite.ts`): a session
// do drizzle só usa `transaction(fn)[modo](tx)`. O ponto crítico é o callback
// `async`: quem fecha a transação é o promise do corpo, não o retorno imediato
// do callback. Se o COMMIT saísse antes de o corpo terminar, o efeito ficaria
// fora da transação — e é esse caminho que o dual-dialect usa.

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

function inserir(banco: BancoFalso, nome: string): void {
	banco.prepare('INSERT INTO t (nome) VALUES (?)').run(nome);
}

describe('shim de transação do node:sqlite', () => {
	it('commita quando o callback é síncrono', () => {
		const banco = novoBanco();
		const tx = banco.transaction(() => {
			inserir(banco, 'a');
		});

		tx.deferred();

		expect(contar(banco)).toEqual({ n: 1 });
	});

	it('desfaz tudo quando o callback síncrono lança', () => {
		const banco = novoBanco();
		const tx = banco.transaction(() => {
			inserir(banco, 'a');
			throw new Error('falhou no meio');
		});

		expect(() => tx.deferred()).toThrow('falhou no meio');
		expect(contar(banco)).toEqual({ n: 0 });
	});

	it('só commita depois que o callback async resolve', async () => {
		const banco = novoBanco();
		const tx = banco.transaction(async () => {
			inserir(banco, 'a');
			await Promise.resolve();
			inserir(banco, 'b');
		});

		// O promise resolve depois do COMMIT: quem espera, espera a transação
		// inteira — não um COMMIT que saiu antes do segundo insert.
		await tx.deferred();

		expect(contar(banco)).toEqual({ n: 2 });
	});

	it('desfaz tudo quando o callback async rejeita', async () => {
		const banco = novoBanco();
		const tx = banco.transaction(async () => {
			inserir(banco, 'a');
			await Promise.resolve();
			throw new Error('falhou no meio');
		});

		await expect(tx.deferred()).rejects.toThrow('falhou no meio');
		expect(contar(banco)).toEqual({ n: 0 });
	});
});
