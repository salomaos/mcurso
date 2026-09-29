import { PROVEDOR } from './driver';
import { db, type Banco, brutoSqlite } from './index';

// Transação é a segunda operação que não tem um jeito só. O PostgreSQL e o
// MySQL têm transação assíncrona nativa (`db.transaction(async (tx) => …)`); o
// `better-sqlite3` recusa callback que devolve promise ("Transaction function
// cannot return a promise") e o drizzle transforma isso num erro.
//
// A saída é o inverso do costume do Drizzle: em vez de a transação aceitar
// callback assíncrono só no SQLite, é **o app inteiro** que usa callback
// assíncrono, e o SQLite resolve por conta própria com `BEGIN`/`COMMIT`
// manuais na conexão (que é única, então as statements do callback já rodam
// dentro da transação).
//
// Efeito colateral bom: as quatro transações do app deixou de usar `.run()`,
// que só existe no driver síncrono.

/** Uma transação em andamento, para o SQLite não aceitar duas ao mesmo tempo. */
let fila: Promise<void> = Promise.resolve();

async function transacaoSqlite<T>(fn: (tx: Banco) => Promise<T>): Promise<T> {
	// Serializa: um `BEGIN` intercalado com outro faria as statements de um
	// request entrarem na transação do outro, já que a conexão é uma só.
	const anterior = fila;
	let abrir: () => void = () => {};
	fila = new Promise<void>((resolve) => {
		abrir = resolve;
	});
	await anterior;

	const sql = brutoSqlite();
	try {
		sql.exec('BEGIN');
		try {
			const resultado = await fn(db);
			sql.exec('COMMIT');
			return resultado;
		} catch (erro) {
			try {
				sql.exec('ROLLBACK');
			} catch {
				// O ROLLBACK falha quando a transação já tinha sido desfeita
				// (ou quando a conexão caiu). O erro original é o que importa.
			}
			throw erro;
		}
	} finally {
		abrir();
	}
}

export async function emTransacao<T>(fn: (tx: Banco) => Promise<T>): Promise<T> {
	if (PROVEDOR === 'sqlite') return transacaoSqlite(fn);

	// `tx` do PostgreSQL/MySQL é o objeto de transação do driver; a superfície
	// que o app usa (`update`/`delete` com `set`/`where`) é a mesma, então o
	// callback não precisa saber em qual dialeto está.
	return db.transaction((tx) => fn(tx as unknown as Banco)) as Promise<T>;
}
