import { fail, redirect } from '@sveltejs/kit';
import { caminhoExercicio } from '$lib/conteudo';
import { criarExercicio, excluirExercicio, listarExercicios } from '$lib/server/exercicio';
import { requerSessao } from '$lib/server/guard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requerSessao(event);
	return { exercicios: await listarExercicios() };
};

export const actions: Actions = {
	criar: async (event) => {
		requerSessao(event);
		const exercicio = await criarExercicio();
		throw redirect(303, `${caminhoExercicio(exercicio.id)}/editar?novo=1`);
	},

	excluir: async (event) => {
		requerSessao(event);
		const dados = await event.request.formData();
		const exercicioId = Number(dados.get('exercicioId') ?? '');
		if (!Number.isInteger(exercicioId) || exercicioId <= 0) {
			return fail(400, { erro: 'Atividade inválida.' });
		}

		const falha = await excluirExercicio(exercicioId);
		if (falha) return fail(falha.status, { erro: falha.erro });

		return { ok: true };
	}
};
