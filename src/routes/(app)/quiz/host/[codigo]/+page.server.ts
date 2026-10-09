import { error } from '@sveltejs/kit';
import { avancarSala, buscarSala, estadoHost } from '$lib/server/quiz-sala';
import { requerSessao } from '$lib/server/guard';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requerSessao(event);

	const sala = buscarSala(event.params.codigo);
	if (!sala) throw error(404, 'Sala não encontrada');

	avancarSala(sala);
	return { estado: estadoHost(sala) };
};
