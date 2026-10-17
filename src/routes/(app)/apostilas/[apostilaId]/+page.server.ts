import { fail, redirect } from '@sveltejs/kit';
import {
	carregarPainel,
	criarAula,
	criarSecao,
	excluirApostila,
	excluirAula,
	excluirSecao,
	renomearApostila,
	renomearSecao,
	reordenarAulas,
	reordenarSecoes,
	type FalhaPainel
} from '$lib/server/apostila';
import { requerSessao } from '$lib/server/guard';
import type { Actions, PageServerLoad } from './$types';

// Toda a lógica de banco vive em `$lib/server/apostila`; aqui só se lê o
// FormData e se traduz o `FalhaPainel | null` no retorno da action (null = ok).
function resposta(falha: FalhaPainel | null) {
	return falha ? fail(falha.status, { erro: falha.erro, alvo: falha.alvo }) : { ok: true };
}

export const load: PageServerLoad = (event) => carregarPainel(Number(event.params.apostilaId));

export const actions: Actions = {
	renomear: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);
		const dados = await event.request.formData();
		return resposta(await renomearApostila(apostilaId, dados));
	},

	criarSecao: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);
		const dados = await event.request.formData();
		return resposta(await criarSecao(apostilaId, dados));
	},

	renomearSecao: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);
		const dados = await event.request.formData();
		return resposta(await renomearSecao(apostilaId, dados));
	},

	excluirSecao: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);
		const dados = await event.request.formData();
		return resposta(await excluirSecao(apostilaId, dados));
	},

	reordenarSecoes: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);
		const dados = await event.request.formData();
		return resposta(await reordenarSecoes(apostilaId, dados));
	},

	reordenarAulas: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);
		const dados = await event.request.formData();
		return resposta(await reordenarAulas(apostilaId, dados));
	},

	criarAula: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);
		const aulaId = await criarAula(apostilaId);
		throw redirect(303, `/apostilas/${apostilaId}/aulas/${aulaId}/editar?novo=1`);
	},

	excluirAula: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);
		const dados = await event.request.formData();
		return resposta(await excluirAula(apostilaId, dados));
	},

	excluir: async (event) => {
		requerSessao(event);
		await excluirApostila(Number(event.params.apostilaId));
		throw redirect(303, '/apostilas');
	}
};
