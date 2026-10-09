import { error, redirect } from '@sveltejs/kit';
import { avancarSala, buscarSala, estadoJogador } from '$lib/server/quiz-sala';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
	const sala = buscarSala(params.codigo);
	if (!sala) throw error(404, 'Sala não encontrada');

	avancarSala(sala);

	const jogadorId = url.searchParams.get('j');
	const estado = jogadorId ? estadoJogador(sala, jogadorId) : null;
	// Sem jogador válido (recarregou sem o `?j=`, servidor reiniciou ou a sala
	// encerrou) o aluno volta para a tela de código.
	if (!estado || !jogadorId) throw redirect(303, '/quiz/jogar');

	return { estado, jogadorId };
};
