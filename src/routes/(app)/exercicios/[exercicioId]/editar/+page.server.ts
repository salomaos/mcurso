import { fail, redirect } from '@sveltejs/kit';
import { caminhoExercicio } from '$lib/conteudo';
import { alvosAnexos } from '$lib/server/anexo';
import { alvosExercicios, buscarExercicio, salvarExercicio } from '$lib/server/exercicio';
import { requerSessao } from '$lib/server/guard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requerSessao(event);
	const exercicio = await buscarExercicio(Number(event.params.exercicioId));

	return {
		exercicio,
		alvos: { aulas: [], anexos: await alvosAnexos(), exercicios: await alvosExercicios() },
		novo: event.url.searchParams.get('novo') === '1'
	};
};

export const actions: Actions = {
	salvar: async (event) => {
		requerSessao(event);
		const exercicioId = Number(event.params.exercicioId);

		const falha = await salvarExercicio(exercicioId, await event.request.formData());
		if (falha) return fail(falha.status, { erro: falha.erro });

		throw redirect(303, caminhoExercicio(exercicioId));
	}
};
