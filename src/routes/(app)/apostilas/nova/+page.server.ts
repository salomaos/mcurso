import { fail, redirect } from '@sveltejs/kit';
import { inserir } from '$lib/server/db/inserir';
import { apostilas } from '$lib/server/db/schema';
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

		const nova = await inserir(apostilas, { titulo, descricao });
		throw redirect(303, `/apostilas/${nova.id}`);
	}
};