import { fail, redirect } from '@sveltejs/kit';
import { caminhoAnexo } from '$lib/conteudo';
import { alvosAnexos, buscarAnexo, salvarAnexo } from '$lib/server/anexo';
import { requerSessao } from '$lib/server/guard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requerSessao(event);
	const anexo = await buscarAnexo(Number(event.params.anexoId));

	return {
		anexo,
		alvos: { aulas: [], anexos: await alvosAnexos(), exercicios: [] },
		novo: event.url.searchParams.get('novo') === '1'
	};
};

export const actions: Actions = {
	salvar: async (event) => {
		requerSessao(event);
		const anexoId = Number(event.params.anexoId);

		const falha = await salvarAnexo(anexoId, await event.request.formData());
		if (falha) return fail(falha.status, { erro: falha.erro });

		throw redirect(303, caminhoAnexo(anexoId));
	}
};
