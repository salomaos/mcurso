import { fail, redirect } from '@sveltejs/kit';
import { buscarQuiz, salvarQuiz } from '$lib/server/quiz';
import { requerSessao } from '$lib/server/guard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requerSessao(event);
	const quiz = await buscarQuiz(Number(event.params.quizId));

	return {
		quiz,
		novo: event.url.searchParams.get('novo') === '1'
	};
};

export const actions: Actions = {
	salvar: async (event) => {
		requerSessao(event);
		const quizId = Number(event.params.quizId);

		const falha = await salvarQuiz(quizId, await event.request.formData());
		if (falha) return fail(falha.status, { erro: falha.erro });

		throw redirect(303, '/quiz');
	}
};
