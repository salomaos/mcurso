import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Blocos } from '$lib/blocks';
import { normalizarBlocos } from '$lib/blocks';
import { db } from '$lib/server/db';
import { apostilas, aulas, secoes } from '$lib/server/db/schema';

export async function buscarAulaPublica(apostilaId: number, aulaId: number) {
	const [aula] = await db.select().from(aulas).where(eq(aulas.id, aulaId)).limit(1);
	if (!aula || aula.apostilaId !== apostilaId) throw error(404, 'Aula não encontrada');

	const [apostila] = await db
		.select()
		.from(apostilas)
		.where(eq(apostilas.id, apostilaId))
		.limit(1);
	if (!apostila) throw error(404, 'Apostila não encontrada');

	const [secao] = aula.secaoId
		? await db.select().from(secoes).where(eq(secoes.id, aula.secaoId)).limit(1)
		: [undefined];

	return {
		apostila,
		aula: {
			...aula,
			secao: secao?.nome ?? null,
			blocos: normalizarBlocos(aula.blocos as Blocos)
		}
	};
}
