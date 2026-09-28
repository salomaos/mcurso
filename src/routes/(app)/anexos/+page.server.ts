import { fail, redirect } from '@sveltejs/kit';
import { caminhoAnexo, type AnexoUi } from '$lib/conteudo';
import { criarAnexo, excluirAnexo, listarAnexos } from '$lib/server/anexo';
import { requerSessao } from '$lib/server/guard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad<{ anexos: AnexoUi[] }> = async (event) => {
	requerSessao(event);
	return { anexos: await listarAnexos() };
};

export const actions: Actions = {
	criar: async (event) => {
		requerSessao(event);
		const anexo = await criarAnexo();
		throw redirect(303, `${caminhoAnexo(anexo.id)}/editar?novo=1`);
	},

	excluir: async (event) => {
		requerSessao(event);
		const dados = await event.request.formData();
		const anexoId = Number(dados.get('anexoId') ?? '');
		if (!Number.isInteger(anexoId) || anexoId <= 0) return fail(400, { erro: 'Anexo inválido.' });

		const falha = await excluirAnexo(anexoId);
		if (falha) return fail(falha.status, { erro: falha.erro });

		return { ok: true };
	}
};
