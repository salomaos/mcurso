import { desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { apostilas } from '$lib/server/db/schema';
import { requerSessao } from '$lib/server/guard';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requerSessao(event);
	const lista = await db.select().from(apostilas).orderBy(desc(apostilas.updatedAt));
	return { apostilas: lista };
};