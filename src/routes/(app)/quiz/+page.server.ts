import { fail, redirect } from '@sveltejs/kit';
import { caminhoEditarQuiz, caminhoHost } from '$lib/quiz';
import { criarQuiz, excluirQuiz, listarQuizzes, buscarQuiz } from '$lib/server/quiz';
import { criarSala } from '$lib/server/quiz-sala';
import { requerSessao } from '$lib/server/guard';
import type { Actions, PageServerLoad } from './$types';

function idDaForm(dados: FormData): number {
	const id = Number(dados.get('quizId') ?? '');
	return Number.isInteger(id) && id > 0 ? id : NaN;
}

export const load: PageServerLoad = async (event) => {
	requerSessao(event);
	return { quizzes: await listarQuizzes() };
};

export const actions: Actions = {
	criar: async (event) => {
		requerSessao(event);
		const quiz = await criarQuiz();
		throw redirect(303, `${caminhoEditarQuiz(quiz.id)}?novo=1`);
	},

	excluir: async (event) => {
		requerSessao(event);
		const quizId = idDaForm(await event.request.formData());
		if (Number.isNaN(quizId)) return fail(400, { erro: 'Quiz inválido.' });

		const falha = await excluirQuiz(quizId);
		if (falha) return fail(falha.status, { erro: falha.erro });

		return { ok: true };
	},

	// Abre uma sala com código e leva o professor para a tela de controle.
	iniciar: async (event) => {
		requerSessao(event);
		const quizId = idDaForm(await event.request.formData());
		if (Number.isNaN(quizId)) return fail(400, { erro: 'Quiz inválido.' });

		const quiz = await buscarQuiz(quizId);
		if (quiz.perguntas.length === 0) {
			return fail(400, { erro: 'Adicione perguntas ao quiz antes de iniciar.' });
		}

		const sala = criarSala(quiz);
		throw redirect(303, caminhoHost(sala.codigo));
	}
};
