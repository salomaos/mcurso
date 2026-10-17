import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { inserirId } from '$lib/server/db/inserir';
import { apostilas } from '$lib/server/db/tabelas';
import { requerSessao } from '$lib/server/guard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requerSessao(event);
	return {};
};

export const actions: Actions = {
	criar: async (event) => {
		requerSessao(event);
		const dados = await event.request.formData();
		const titulo = String(dados.get('titulo') ?? '').trim();
		const descricao = String(dados.get('descricao') ?? '').trim();

		if (!titulo) return fail(400, { erro: 'Informe o título da apostila.' });

		const novaId = await inserirId(db.insert(apostilas).values({ titulo, descricao }));
		throw redirect(303, `/apostilas/${novaId}`);
	}
};