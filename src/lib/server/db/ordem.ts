import { eq, max } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { db } from './index';

// `max()` é o segredo de "qual é a próxima ordem" ao criar seção/aula, e é uma
// pegadinha de dialeto: no SQLite e no PostgreSQL volta `number`, mas no MySQL
// `MAX(int)` é DECIMAL e o `mysql2` devolve decimal como **string**. Sem o
// `Number()` daqui, `(max ?? 0) + 1` viraria concatenação — a segunda seção
// criada na apostila viraria "51" em vez de 2, e o sintoma apareceria só na
// ordem da listagem, muito depois do erro.

type ComOrdem = SQLiteTable & { ordem: unknown; apostilaId: unknown };

/** Maior `ordem` existente na apostila, ou `null` se ainda não houver nenhuma. */
export async function maiorOrdem(tabela: ComOrdem, apostilaId: number): Promise<number | null> {
	const [linha] = await db
		.select({ max: max(tabela.ordem as never) })
		.from(tabela)
		.where(eq(tabela.apostilaId as never, apostilaId));

	const valor = linha?.max;
	return valor === null || valor === undefined ? null : Number(valor);
}
