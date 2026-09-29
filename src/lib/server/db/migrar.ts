import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

// As migrações são aplicadas no boot do servidor (ver `index.ts`) para que o deploy
// não dependa de `drizzle-kit`, que é devDependency e não existe em produção. Como o
// servidor roda a partir de `build/`, a pasta é procurada em vários lugares: o `pnpm
// build` deixa uma cópia em `build/drizzle`, e quem roda de um diretório diferente
// ainda acha a original do checkout.
const CANDIDATOS = ['drizzle', 'build/drizzle', '../drizzle'];

// O schema concreto não importa aqui: só o `count` e o `migrate` do drizzle são usados.
type Banco = BetterSQLite3Database<Record<string, unknown>>;

function candidatos(): string[] {
	return [...(process.env.MIGRATIONS_DIR ? [process.env.MIGRATIONS_DIR] : []), ...CANDIDATOS];
}

export function pastaMigrations(cwd = process.cwd()): string | null {
	for (const candidato of candidatos()) {
		const pasta = path.resolve(cwd, candidato);
		if (fs.existsSync(path.join(pasta, 'meta', '_journal.json'))) return pasta;
	}

	return null;
}

// Quantas migrações o banco já tem registradas. `__drizzle_migrations` ainda não existe
// no primeiro boot, daí o try/catch: o que importa é o antes/depois para o log.
function totalMigracoes(db: Banco): number {
	try {
		const linhas = db.all<{ total: number }>(
			sql`select count(*) as total from __drizzle_migrations`
		);
		return linhas[0]?.total ?? 0;
	} catch {
		return 0;
	}
}

export function aplicarMigrations(
	db: Banco,
	cwd = process.cwd()
): { pasta: string; aplicadas: number } {
	const pasta = pastaMigrations(cwd);

	if (!pasta) {
		throw new Error(
			`[mcurso] pasta de migrações não encontrada (provei ${candidatos().join(', ')} a partir de ${cwd}). ` +
				'Rode "pnpm db:migrate" antes de subir, ou aponte MIGRATIONS_DIR para a pasta.'
		);
	}

	const antes = totalMigracoes(db);
	// Idempotente: o drizzle pula o que já está registrado em `__drizzle_migrations`.
	migrate(db, { migrationsFolder: pasta });

	return { pasta, aplicadas: totalMigracoes(db) - antes };
}
