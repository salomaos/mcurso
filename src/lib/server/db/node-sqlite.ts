import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { Database } from 'better-sqlite3';

// Por que isto existe
// -------------------
// O build da Hostinger não roda nenhum binário nativo do better-sqlite3: o
// prebuild de qualquer versão recente (12.x/13.x) exige GLIBC_2.29 no host
// (glibc mais antiga) e o fallback de compilação morre no Python 3.6.8 (o gyp
// moderno do node-gyp precisa de 3.8+ por causa do operador walrus). A saída
// definitiva é o SQLite que o próprio Node embute (`node:sqlite`,
// `DatabaseSync`): não baixa nem compila nada, e Node ≥ 22.13 já traz sem flag
// (o host roda Node 22; ver `engines` no package.json).
//
// O driver `better-sqlite3` do drizzle (estável, 0.45.x) usa apenas estas APIs
// do client (verificado no fonte da session):
//   - `prepare().all/get/run`           → o `StatementSync` do node:sqlite tem;
//   - `prepare().raw().all/get`         → modo "cru" (devolve arrays) do
//     better-sqlite3, que o `StatementSync` NÃO tem — embrulhamos o `prepare`
//     para devolver um statement com `raw()` (ver `embrulharPreparado`);
//   - `transaction(fn)`                 → o `DatabaseSync` NÃO tem —
//     embrulhamos com BEGIN/COMMIT/ROLLBACK na mesma forma do better-sqlite3
//     (`.deferred/.immediate/.exclusive`, ver `instalarTransacao`).
// O módulo devolve a instância tipada como `Database` do better-sqlite3 para o
// drizzle aceitar; o app inteiro continua 100% síncrono, sem mudar query.
//
// O `import Client from 'better-sqlite3'` que o driver faz no topo é satisfeito
// por um STUB em `vendor/better-sqlite3-stub` (dependência `file:` no
// package.json): o driver só instancia `new Client(...)` quando o `drizzle(...)`
// é chamado SEM uma instância, e o app sempre passa.

interface TransacaoBetterSqlite {
	deferred: (arg: unknown) => unknown;
	immediate: (arg: unknown) => unknown;
	exclusive: (arg: unknown) => unknown;
	default: (arg: unknown) => unknown;
}

// Forma que o driver espera: `this.client.transaction(fn)` devolve um objeto com
// `.deferred/.immediate/.exclusive`, chamado como
// `nativeTx[config.behavior ?? 'deferred'](tx)`. Aninhamento (savepoints) é o
// próprio drizzle que cuida, via `session.run`.
function instalarTransacao(banco: DatabaseSync): void {
	const alvo = banco as unknown as { transaction: (fn: unknown) => TransacaoBetterSqlite };
	alvo.transaction = (fn: unknown) => {
		const callback = fn as (arg: unknown) => unknown;

		const executar = (inicio: '' | ' IMMEDIATE' | ' EXCLUSIVE') => (arg: unknown) => {
			banco.exec(`BEGIN${inicio}`);
			try {
				const resultado = callback(arg);
				banco.exec('COMMIT');
				return resultado;
			} catch (erro) {
				banco.exec('ROLLBACK');
				throw erro;
			}
		};

		const transacao: TransacaoBetterSqlite = {
			deferred: executar(''),
			immediate: executar(' IMMEDIATE'),
			exclusive: executar(' EXCLUSIVE'),
			// igual ao better-sqlite3: `default` é o modo deferred.
			default: (arg: unknown) => transacao.deferred(arg)
		};
		return transacao;
	};
}

interface StatementComCru {
	raw(): StatementComCru;
	get(...params: SQLInputValue[]): unknown;
	all(...params: SQLInputValue[]): unknown[] | unknown[][];
	run(...params: SQLInputValue[]): unknown;
	iterate(...params: SQLInputValue[]): unknown;
}

// `Stmt.raw()` do better-sqlite3 liga o modo "cru" (linhas viram arrays, não
// objetos) e devolve o próprio statement — o `StatementSync` do node:sqlite não
// tem esse modo. A session do drizzle usa `stmt.raw().get/all(...)` quando há
// `fields` mapeados (todo `select` tipado) e no migrator, então o `prepare` é
// embrulhado para devolver um statement com `raw()`. O flag é por statement
// (o drizzle prepara um por query), então nada vaza entre consultas.
function embrulharPreparado(banco: DatabaseSync): void {
	const prepararOriginal = banco.prepare.bind(banco);
	const alvo = banco as unknown as { prepare: (sql: string) => StatementComCru };
	alvo.prepare = (sql: string) => {
		const stmt = prepararOriginal(sql);
		let cru = false;
		const aplainar = (linha: Record<string, unknown>): unknown[] => Object.values(linha);

		const view: StatementComCru = {
			raw: () => {
				cru = true;
				return view;
			},
			get: (...params: SQLInputValue[]) => {
				const linha = stmt.get(...params);
				return cru && linha !== undefined ? aplainar(linha) : linha;
			},
			all: (...params: SQLInputValue[]) => {
				const linhas = stmt.all(...params);
				return cru ? linhas.map(aplainar) : linhas;
			},
			run: (...params: SQLInputValue[]) => stmt.run(...params),
			iterate: (...params: SQLInputValue[]) => stmt.iterate(...params)
		};
		return view;
	};
}

export function abrirBanco(caminho: string): Database {
	const banco = new DatabaseSync(caminho, { enableForeignKeyConstraints: false });
	// O node:sqlite liga PRAGMA foreign_keys por padrão; o better-sqlite3 deixava
	// DESLIGADO — e o app apaga seção/apostila nullando `aulas.secaoId` por conta
	// própria. `enableForeignKeyConstraints: false` preserva o comportamento atual.
	banco.exec('PRAGMA journal_mode = WAL');
	instalarTransacao(banco);
	embrulharPreparado(banco);
	return banco as unknown as Database;
}