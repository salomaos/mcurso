import 'dotenv/config';
import path from 'node:path';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { PROVEDOR, caminhoSqlite } from './driver';
import { criarConexao } from './conexao';
import { aplicarMigrations } from './migrar';
import * as schemaSqlite from './schema/sqlite';

// Boot do banco. Este módulo é importado pelo `auth.ts`, que o `hooks.server.ts`
// carrega no boot do servidor, então a migração roda antes de qualquer consulta
// e o deploy não precisa de passo separado de migrate.

const bruto = criarConexao(PROVEDOR);

// O app inteiro é escrito contra o schema do SQLite: o Drizzle não compila
// `select()` (genérico em cada dialeto) sobre a união dos três tipos de banco,
// e as queries do app não mudam de forma entre eles. Ver `schema/index.ts` para
// por que a paridade entre os schemas garante que isso é seguro.
export type Banco = BetterSQLite3Database<typeof schemaSqlite>;
export const db = bruto.db as unknown as Banco;

// Só o `transacao.ts` usa, e só quando o dialeto é SQLite: o `better-sqlite3`
// recusa callback de transação assíncrono, então o BEGIN/COMMIT é manual.
export function brutoSqlite() {
	if (bruto.provedor !== 'sqlite') {
		throw new Error(`[mcurso] brutoSqlite() chamado com DB_PROVIDER=${bruto.provedor}`);
	}
	return bruto.bruto;
}

export const uploadsDir =
	process.env.UPLOADS_DIR ?? path.resolve(process.cwd(), 'data/uploads');

const { pasta, aplicadas } = await aplicarMigrations(bruto);
const rotulo = PROVEDOR === 'pg' ? 'postgres' : PROVEDOR;
console.log(
	aplicadas > 0
		? `[mcurso] ${aplicadas} migração(ões) aplicada(s) no ${rotulo} (${caminhoDoBanco()}) (${pasta})`
		: `[mcurso] banco ${rotulo} em dia (${caminhoDoBanco()}) (${pasta})`
);

// A URL tem senha, então o log mostra só o host.
function caminhoDoBanco(): string {
	if (bruto.provedor === 'sqlite') return caminhoSqlite();
	const url = new URL(process.env.DATABASE_URL ?? '');
	return `${url.protocol}//${url.host}${url.pathname ?? ''}`;
}
