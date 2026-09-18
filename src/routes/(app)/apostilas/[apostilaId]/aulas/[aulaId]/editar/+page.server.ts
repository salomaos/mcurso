import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { normalizarBlocos, type Blocos } from '$lib/blocks';
import { db } from '$lib/server/db';
import { apostilas, aulas } from '$lib/server/db/schema';
import { requerSessao } from '$lib/server/guard';
import type { Actions, PageServerLoad } from './$types';

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

export const actions: Actions = {
	salvar: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);
		const aulaId = Number(event.params.aulaId);
		const dados = await event.request.formData();

		const titulo = String(dados.get('titulo') ?? '').trim();
		if (!titulo) return fail(400, { erro: 'Informe o título da aula.' });

		let blocos: Blocos;
		try {
			blocos = normalizarBlocos(JSON.parse(String(dados.get('blocos') ?? '[]')));
		} catch {
			return fail(400, { erro: 'Os blocos enviados são inválidos.' });
		}

		await db
			.update(aulas)
			.set({
				titulo,
				secao: String(dados.get('secao') ?? '').trim() || null,
				descricao: String(dados.get('descricao') ?? '').trim(),
				blocos,
				updatedAt: new Date()
			})
			.where(eq(aulas.id, aulaId));

		throw redirect(303, `/apostilas/${apostilaId}/aulas/${aulaId}`);
	}
};