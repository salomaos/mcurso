import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { normalizarBlocos, type Blocos } from '$lib/blocks';
import { db } from '$lib/server/db';
import { apostilas, aulas } from '$lib/server/db/schema';
import { requerSessao } from '$lib/server/guard';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requerSessao(event);
	const apostilaId = Number(event.params.apostilaId);
	const aulaId = Number(event.params.aulaId);

	const [aula] = await db.select().from(aulas).where(eq(aulas.id, aulaId)).limit(1);
	if (!aula || aula.apostilaId !== apostilaId) throw error(404, 'Aula não encontrada');

	const [apostila] = await db
		.select()
		.from(apostilas)
		.where(eq(apostilas.id, apostilaId))
		.limit(1);

	return {
		apostila,
		aula: { ...aula, blocos: normalizarBlocos(aula.blocos as Blocos) }
	};
};