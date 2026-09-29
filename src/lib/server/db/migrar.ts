import fs from 'node:fs';
import path from 'node:path';
import { migrate as migrarMySql } from 'drizzle-orm/mysql2/migrator';
import { migrate as migrarPg } from 'drizzle-orm/node-postgres/migrator';
import { migrate as migrarSqlite } from 'drizzle-orm/better-sqlite3/migrator';
import { PASTA_MIGRACOES, PROVEDOR, SUFIXO_PASTA, type Provedor } from './driver';
import type { Bruto } from './conexao';

// As migrações são aplicadas no boot do servidor (ver `index.ts`) para que o
// deploy não dependa de `drizzle-kit`, que é devDependency e não existe em
// produção.
//
// Cada dialeto tem pasta própria porque o SQL gerado não é o mesmo
// (`AUTOINCREMENT` vs `serial` vs `auto_increment`, `text` vs `jsonb` vs `json`),
// e porque a tabela de controle do drizzle muda de nome/schema. Só uma delas é
// aplicada em cada boot, conforme a flag do `.env`.

// Como o servidor roda a partir de `build/`, a pasta é procurada em vários
// lugares: o `pnpm build` deixa uma cópia em `build/drizzle`, e quem roda de um
// diretório diferente ainda acha a original do checkout.
const BASES = ['drizzle', 'build/drizzle', '../drizzle'];

function candidatos(provedor: Provedor): string[] {
	return [
		...(process.env.MIGRATIONS_DIR ? [process.env.MIGRATIONS_DIR] : []),
		...BASES.map((base) => path.join(base, SUFIXO_PASTA[provedor]))
	];
}

export function pastaMigrations(
	provedor: Provedor = PROVEDOR,
	cwd = process.cwd()
): string | null {
	for (const candidato of candidatos(provedor)) {
		const pasta = path.resolve(cwd, candidato);
		if (fs.existsSync(path.join(pasta, 'meta', '_journal.json'))) return pasta;
	}

	return null;
}

// Quantas migrações o banco já tem registradas, para o log do boot dizer quantas
// entraram. A forma de ler varia nos três drivers (`all` síncrono no SQLite,
// `QueryResult` no PostgreSQL, tupla `[rows, fields]` no MySQL) e a tabela ainda
// não existe no primeiro boot — daí o try/catch: só o antes/depois importa.
async function totalMigracoes(bruto: Bruto): Promise<number> {
	try {
		if (bruto.provedor === 'sqlite') {
			const linhas = bruto.db.all<{ total: number }>(
				`select count(*) as total from __drizzle_migrations`
			);
			return linhas[0]?.total ?? 0;
		}

		if (bruto.provedor === 'pg') {
			// No PostgreSQL o drizzle guarda as migrations no schema `drizzle`.
			const r = (await bruto.db.execute(
				`select count(*)::int as total from drizzle.__drizzle_migrations`
			)) as unknown as { rows: { total: string | number }[] };
			return Number(r.rows[0]?.total ?? 0);
		}

		const [linhas] = (await bruto.db.execute(
			`select count(*) as total from __drizzle_migrations`
		)) as unknown as [{ total: string | number }[], unknown];
		return Number(linhas[0]?.total ?? 0);
	} catch {
		return 0;
	}
}

export async function aplicarMigrations(
	bruto: Bruto,
	cwd = process.cwd()
): Promise<{ pasta: string; aplicadas: number }> {
	const pasta = pastaMigrations(bruto.provedor, cwd);

	if (!pasta) {
		throw new Error(
			`[mcurso] pasta de migrações do ${bruto.provedor} não encontrada (provei ` +
				`${candidatos(bruto.provedor).join(', ')} a partir de ${cwd}). ` +
				'Rode "pnpm build" antes de subir, ou aponte MIGRATIONS_DIR para a pasta.'
		);
	}

	const antes = await totalMigracoes(bruto);

	// Idempotente: o drizzle pula o que já está registrado.
	const opcoes = { migrationsFolder: pasta };
	if (bruto.provedor === 'sqlite') migrarSqlite(bruto.db, opcoes);
	else if (bruto.provedor === 'pg') await migrarPg(bruto.db, opcoes);
	else await migrarMySql(bruto.db, opcoes);

	return { pasta, aplicadas: (await totalMigracoes(bruto)) - antes };
}

/** Só para o log e para mensagens de erro. */
export function pastaEsperada(provedor: Provedor): string {
	return PASTA_MIGRACOES[provedor];
}
