// Ponto único das transações do app. Todo corpo de transação do projeto passa
// por aqui — e as duas versões (SQLite e MySQL) recebem o MESMO corpo, escrito
// com `await`.
//
// Em SQLite quem fecha a transação é o shim de `./node-sqlite`: o corpo é async,
// as consultas executam na hora (o `node:sqlite` é síncrono) e o shim faz
// COMMIT/ROLLBACK quando o promise do corpo assenta. Isso mantém a transação
// atômica porque **todo `await` do corpo resolve em microtask** — o corpo inteiro
// termina dentro do mesmo giro do event loop, e outra requisição só seria
// atendida num giro seguinte. No MySQL o `db.transaction` do drizzle já é async
// e faz o mesmo papel.
//
// REGRA DO CORPO: nada de I/O (fetch, `fs/promises`, `setTimeout`, consulta de
// outro serviço) enquanto a transação está aberta. Só consulta do próprio `db` e
// código puro. Um `await` que dependa de I/O gira o event loop, outra requisição
// entra na transação e o COMMIT/ROLLBACK passa a valer para ela também. Se um dia
// um corpo precisar de I/O, faça o I/O antes de abrir a transação.

import { db } from '$lib/server/db';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function transacao<T>(corpo: (tx: Tx) => Promise<T>): Promise<T> {
	return db.transaction(corpo);
}
