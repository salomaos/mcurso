// Ponto único das transações do app.
//
// Hoje só existe o dialeto SQLite: a transação é síncrona (o `node:sqlite` é
// síncrono e o shim em `./node-sqlite` roda BEGIN/COMMIT na hora). O callback
// NÃO pode ser `async` — o shim lança `Transaction function cannot return a
// promise` —, porque um `await` no meio deixaria a transação aberta e outra
// requisição entraria nela.
//
// No dual-dialect este módulo passa a escolher a implementação por `DB_DIALECT`
// (build por dialeto): a versão MySQL recebe callback `async` e faz
// `await db.transaction(...)`, e os corpos nas chamadas trocam `.run()` por
// `await`. Por isso a assinatura já devolve `Promise` e as chamadas já usam
// `await` — elas não mudam quando o MySQL chegar.

import { db } from '$lib/server/db';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function transacao<T>(fn: (tx: Tx) => T): Promise<T> {
	return db.transaction(fn);
}
