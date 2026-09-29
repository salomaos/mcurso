import { count, desc, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { apostilas, aulas } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export type ApostilaComTotal = typeof apostilas.$inferSelect & { totalAulas: number };

export const load: PageServerLoad = async () => {
	const lista = await db.select().from(apostilas).orderBy(desc(apostilas.updatedAt));

	const totalPorApostila = new Map<number, number>();
	if (lista.length > 0) {
		const contagens = await db
			.select({ apostilaId: aulas.apostilaId, total: count() })
			.from(aulas)
			.where(inArray(aulas.apostilaId, lista.map((a) => a.id)))
			.groupBy(aulas.apostilaId);
		// `count()` é tipado como `number`, mas no PostgreSQL (bigint) e no MySQL
		// volta como string. Sem o Number(), a lista mostraria "12" e a tipagem
		// ficaria mentindo.
		for (const c of contagens) totalPorApostila.set(c.apostilaId, Number(c.total));
	}

	return {
		apostilas: lista.map((a) => ({
			...a,
			totalAulas: totalPorApostila.get(a.id) ?? 0
		}))
	};
};