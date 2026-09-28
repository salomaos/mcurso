import { fail, redirect } from '@sveltejs/kit';
import { caminhoAula } from '$lib/conteudo';
import { carregarParaEditar, salvarAula } from '$lib/server/aula';
import { requerSessao } from '$lib/server/guard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requerSessao(event);
	const apostilaId = Number(event.params.apostilaId);
	const aulaId = Number(event.params.aulaId);
	const { apostila, secoes, aula, alvos } = await carregarParaEditar(apostilaId, aulaId);

	return {
		apostila,
		secoes,
		aula,
		alvos,
		novo: event.url.searchParams.get('novo') === '1'
	};
};

export const actions: Actions = {
	salvar: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);
		const aulaId = Number(event.params.aulaId);

		const falha = await salvarAula(apostilaId, aulaId, await event.request.formData());
		if (falha) return fail(falha.status, { erro: falha.erro });

		throw redirect(303, caminhoAula(apostilaId, aulaId));
	}
};
