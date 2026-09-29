import { eq } from 'drizzle-orm';
import type { AnyColumn } from 'drizzle-orm/column';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { PROVEDOR } from './driver';
import { db } from './index';

// Inserir e recuperar a linha criada é a única operação do app que não tem um
// jeito só: o SQLite e o PostgreSQL têm `RETURNING`, o MySQL não tem (devolve só
// o `insertId`). Este é o lugar onde isso é resolvido, para as 5 chamadas do app
// lerem igual nas três.
//
// No MySQL a linha é relida depois do insert. Custa uma query a mais em 5
// caminhos frios (criar apostila/aula/seção/anexo/atividade) e evita ter que
// reconstruir a linha na mão em cada um deles.

// O `db` é tipado pelo SQLite (ver `index.ts`), então o builder de insert não
// descreve as variantes. O cast fica aqui, dentro do módulo que existe para
// absorver a diferença.
type ColunaId = AnyColumn;
type ComId = SQLiteTable & { id: ColunaId };

/** O que o MySQL devolve de um insert, em vez da linha. */
type InsercaoMySql = { insertId?: number | bigint };

export async function inserir<T extends ComId>(
	tabela: T,
	valores: T['$inferInsert']
): Promise<T['$inferSelect']> {
	if (PROVEDOR === 'mysql') {
		const builder = db.insert(tabela) as unknown as {
			values(v: T['$inferInsert']): Promise<InsercaoMySql>;
		};

		const { insertId } = await builder.values(valores);
		const id = Number(insertId);

		const [linha] = await db
			.select()
			.from(tabela)
			.where(eq(tabela.id as ColunaId, id))
			.limit(1);

		if (!linha) throw new Error(`[mcurso] insert não devolveu a linha #${id}`);
		return linha;
	}

	const [linha] = await db.insert(tabela).values(valores).returning();
	return linha;
}
