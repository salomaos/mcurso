import { fail, redirect } from '@sveltejs/kit';
import { caminhoJogar } from '$lib/quiz';
import { entrarSala, normalizarCodigo } from '$lib/server/quiz-sala';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => ({
	codigo: normalizarCodigo(url.searchParams.get('codigo') ?? '')
});

export const actions: Actions = {
	entrar: async ({ request }) => {
		const dados = await request.formData();
		const codigo = normalizarCodigo(String(dados.get('codigo') ?? ''));
		const nome = String(dados.get('nome') ?? '');

		const resultado = entrarSala(codigo, nome);
		if ('erro' in resultado) return fail(400, { erro: resultado.erro, codigo, nome });

		throw redirect(303, `${caminhoJogar(codigo)}?j=${resultado.id}`);
	}
};
