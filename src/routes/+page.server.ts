import { count, desc, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { apostilas, aulas } from '$lib/server/db/tabelas';
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
		for (const c of contagens) totalPorApostila.set(c.apostilaId, c.total);
	}

	return {
		apostilas: lista.map((a) => ({
			...a,
			totalAulas: totalPorApostila.get(a.id) ?? 0
		}))
	};
};