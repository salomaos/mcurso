import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { migrate as migrarSqlite } from 'drizzle-orm/better-sqlite3/migrator';
import { migrate as migrarMysql } from 'drizzle-orm/mysql2/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { MySql2Database } from 'drizzle-orm/mysql2';

// As migrações são aplicadas no boot do servidor (ver `index.ts`) para que o deploy
// não dependa de `drizzle-kit`, que é devDependency e não existe em produção. Como o
// servidor roda a partir de `build/`, a pasta é procurada em vários lugares: o `pnpm
// build` deixa uma cópia em `build/drizzle`, e quem roda de um diretório diferente
// ainda acha a original do checkout.
export type DialetoBanco = 'sqlite' | 'mysql';

// A pasta é por dialeto: `drizzle/` (SQLite) e `drizzle-mysql/` (MySQL/MariaDB).
const PASTAS: Record<DialetoBanco, string[]> = {
	sqlite: ['drizzle', 'build/drizzle', '../drizzle'],
	mysql: ['drizzle-mysql', 'build/drizzle-mysql', '../drizzle-mysql']
};

// O schema concreto não importa aqui: só o `count`, o `execute` e o `migrate` do
// drizzle são usados.
type BancoSqlite = BetterSQLite3Database<Record<string, unknown>>;
type BancoMysql = MySql2Database<Record<string, unknown>>;

function candidatos(dialeto: DialetoBanco): string[] {
	return [...(process.env.MIGRATIONS_DIR ? [process.env.MIGRATIONS_DIR] : []), ...PASTAS[dialeto]];
}

export function pastaMigrations(
	cwd = process.cwd(),
	dialeto: DialetoBanco = 'sqlite'
): string | null {
	for (const candidato of candidatos(dialeto)) {
		const pasta = path.resolve(cwd, candidato);
		if (fs.existsSync(path.join(pasta, 'meta', '_journal.json'))) return pasta;
	}

	return null;
}

// Quantas migrações o banco já tem registradas. `__drizzle_migrations` ainda não existe
// no primeiro boot, daí o try/catch: o que importa é o antes/depois para o log.
function totalMigracoesSqlite(db: BancoSqlite): number {
	try {
		const linhas = db.all<{ total: number }>(
			sql`select count(*) as total from __drizzle_migrations`
		);
		return linhas[0]?.total ?? 0;
	} catch {
		return 0;
	}
}

// No MySQL o mesmo select é assíncrono e o mysql2 embrulha o resultado em
// `[linhas, campos]`; como o número é só para o log, qualquer forma inesperada cai
// no 0 do catch.
async function totalMigracoesMysql(db: BancoMysql): Promise<number> {
	try {
		const resultado = (await db.execute(
			sql`select count(*) as total from __drizzle_migrations`
		)) as unknown;
		const linhas =
			Array.isArray(resultado) && Array.isArray((resultado as unknown[])[0])
				? (resultado as unknown[])[0]
				: resultado;
		const primeira = (linhas as { total?: number }[])[0];
		return Number(primeira?.total ?? 0);
	} catch {
		return 0;
	}
}

export async function aplicarMigrations(
	// A instância do drizzle, seja qual for o dialeto. O parâmetro é `unknown`
	// porque os dois bancos só têm a API em comum em runtime (o `db` do app é
	// tipado pelo SQLite — ver `index.ts`); o cast para o tipo do dialeto
	// acontece aqui dentro, que é onde o drizzle precisa do tipo exato.
	db: unknown,
	dialeto: DialetoBanco = 'sqlite',
	cwd = process.cwd()
): Promise<{ pasta: string; aplicadas: number }> {
	const pasta = pastaMigrations(cwd, dialeto);

	if (!pasta) {
		throw new Error(
			`[mcurso] pasta de migrações (${dialeto}) não encontrada (provei ${candidatos(dialeto).join(', ')} a partir de ${cwd}). ` +
				'Rode "pnpm db:migrate" antes de subir, ou aponte MIGRATIONS_DIR para a pasta.'
		);
	}

	if (dialeto === 'mysql') {
		const banco = db as BancoMysql;
		const antes = await totalMigracoesMysql(banco);
		// Idempotente: o drizzle pula o que já está registrado em `__drizzle_migrations`.
		await migrarMysql(banco, { migrationsFolder: pasta });
		return { pasta, aplicadas: (await totalMigracoesMysql(banco)) - antes };
	}

	const banco = db as BancoSqlite;
	const antes = totalMigracoesSqlite(banco);
	// Idempotente: o drizzle pula o que já está registrado em `__drizzle_migrations`.
	migrarSqlite(banco, { migrationsFolder: pasta });
	return { pasta, aplicadas: totalMigracoesSqlite(banco) - antes };
}
