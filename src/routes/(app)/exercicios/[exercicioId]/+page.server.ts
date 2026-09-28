// Página pública da atividade: o aluno responde sem login e o gabarito nunca
// sai daqui. A correção acontece no POST e devolve chave + resultado, sem
// guardar nada no banco.

import { fail } from '@sveltejs/kit';
import { corrigirExercicio } from '$lib/corrigir';
import {
	buscarExercicio,
	buscarExercicioPublico,
	contextoAtividade,
	hashGabarito
} from '$lib/server/exercicio';
import { criarChave, formatarChave, formatarQuando } from '$lib/server/chave';
import { erroNaoEncontrado } from '$lib/server/conteudo';
import type { Actions, PageServerLoad } from './$types';

function idDaUrl(valor: string): number {
	const id = Number(valor);
	return Number.isInteger(id) && id > 0 ? id : NaN;
}

export const load: PageServerLoad = async (event) => {
	const exercicioId = idDaUrl(event.params.exercicioId);
	if (Number.isNaN(exercicioId)) throw erroNaoEncontrado('exercicio');

	const atividade = await buscarExercicioPublico(exercicioId);
	const contexto = await contextoAtividade(
		{ id: exercicioId, titulo: atividade.titulo },
		event.url.searchParams.get('aula')
	);

	return { atividade, contexto };
};

export const actions: Actions = {
	responder: async (event) => {
		const exercicioId = idDaUrl(event.params.exercicioId);
		if (Number.isNaN(exercicioId)) throw erroNaoEncontrado('exercicio');

		const dados = await event.request.formData();
		const nome = String(dados.get('nome') ?? '').trim();
		if (!nome) {
			return fail(400, { erro: 'Informe seu nome para gerar o resultado.', nome: '' });
		}
		if (nome.length > 80) {
			return fail(400, { erro: 'Nome muito longo.', nome });
		}

		const atividade = await buscarExercicio(exercicioId);
		const correcao = corrigirExercicio(atividade.blocos, dados);
		if (correcao.total === 0 && correcao.dissertativas.length === 0) {
			return fail(400, { erro: 'Esta atividade ainda não tem perguntas.' });
		}

		const contexto = await contextoAtividade(
			{ id: exercicioId, titulo: atividade.titulo },
			event.url.searchParams.get('aula')
		);

		const quando = Math.floor(Date.now() / 1000);
		const chave = criarChave({
			nome,
			quando,
			exercicio: exercicioId,
			titulo: atividade.titulo,
			apostila: contexto.aula?.apostilaTitulo ?? null,
			aula: contexto.aula?.titulo ?? null,
			acertos: correcao.acertos,
			total: correcao.total,
			gabarito: hashGabarito(atividade.blocos)
		});

		return {
			ok: true as const,
			nome,
			correcao,
			chave,
			chaveFormatada: formatarChave(chave),
			quando: formatarQuando(quando)
		};
	}
};
