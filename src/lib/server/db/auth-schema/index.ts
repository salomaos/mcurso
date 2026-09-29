import { PROVEDOR } from '../driver';
import * as mysql from './mysql';
import * as postgres from './postgres';
import * as sqlite from './sqlite';

// Mesma ideia de `schema/index.ts`: o dialeto do `.env` escolhe o arquivo, e o
// app inteiro enxerga a variante do SQLite. Aqui o motivo é mais forte — as três
// saem do `@better-auth/cli`, e ele gera tipos genuinamente diferentes por
// dialeto (`unixepoch` e inteiro em ms no SQLite, `now()` e `timestamp` no
// PostgreSQL, `varchar(36)` e `timestamp(3)` no MySQL).
//
// Regerar os três: `pnpm db:auth`.

const porProvedor = {
	sqlite,
	pg: postgres,
	mysql
} as const;

const escolhido = porProvedor[PROVEDOR] as unknown as typeof sqlite;

export const user = escolhido.user;
export const session = escolhido.session;
export const account = escolhido.account;
export const verification = escolhido.verification;

export const tabelasAuth = { user, session, account, verification };

// O `drizzleAdapter` do Better Auth e os `relations()` do Drizzle recebem a
// referência de tipo do SQLite; o guarda abaixo é o mesmo de `schema/index.ts`.
type Igual<A, B> = (<U>() => U extends A ? 1 : 2) extends <U>() => U extends B ? 1 : 2
	? true
	: false;

const _mesmaForma: [
	Igual<typeof user.$inferSelect, typeof sqlite.user.$inferSelect>,
	Igual<typeof session.$inferSelect, typeof sqlite.session.$inferSelect>,
	Igual<typeof account.$inferSelect, typeof sqlite.account.$inferSelect>,
	Igual<typeof verification.$inferSelect, typeof sqlite.verification.$inferSelect>
] = [true, true, true, true];

void _mesmaForma;
