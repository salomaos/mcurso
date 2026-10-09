// API da sala de quiz: o GET é o polling (~1s) e o POST recebe as ações
// (professor inicia/avança; aluno responde). A sala vive em memória, então cada
// leitura também resolve o auto-avanço por tempo.

import { json } from '@sveltejs/kit';
import {
	avancarSala,
	buscarSala,
	encerrarSala,
	estadoHost,
	estadoJogador,
	iniciarSala,
	proximaEtapa,
	removerSala,
	responder
} from '$lib/server/quiz-sala';
import type { RequestHandler } from './$types';

const SEM_CACHE = { 'cache-control': 'no-store' };

export const GET: RequestHandler = ({ params, url, locals }) => {
	const sala = buscarSala(params.codigo);
	if (!sala) return json({ erro: 'Sala não encontrada.' }, { status: 404, headers: SEM_CACHE });

	avancarSala(sala);

	const jogadorId = url.searchParams.get('j');
	if (jogadorId) {
		const estado = estadoJogador(sala, jogadorId);
		if (!estado) {
			return json({ erro: 'Você não está mais nesta sala.' }, { status: 404, headers: SEM_CACHE });
		}
		return json(estado, { headers: SEM_CACHE });
	}

	if (locals.session) return json(estadoHost(sala), { headers: SEM_CACHE });
	return json({ erro: 'Informe o jogador.' }, { status: 400, headers: SEM_CACHE });
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const sala = buscarSala(params.codigo);
	if (!sala) return json({ erro: 'Sala não encontrada.' }, { status: 404 });

	let corpo: { acao?: unknown; jogadorId?: unknown; indice?: unknown };
	try {
		corpo = (await request.json()) as typeof corpo;
	} catch {
		return json({ erro: 'Corpo inválido.' }, { status: 400 });
	}

	if (corpo.acao === 'responder') {
		const resultado = responder(sala, String(corpo.jogadorId ?? ''), Number(corpo.indice));
		if ('erro' in resultado) return json({ erro: resultado.erro }, { status: 400 });
		return json({ ok: true, correta: resultado.correta, pontos: resultado.pontos });
	}

	// Daqui para baixo é o professor.
	if (!locals.session) {
		return json({ erro: 'Apenas o professor controla a partida.' }, { status: 403 });
	}

	avancarSala(sala);

	if (corpo.acao === 'iniciar') {
		const resultado = iniciarSala(sala);
		return resultado.erro ? json({ erro: resultado.erro }, { status: 400 }) : json({ ok: true });
	}
	if (corpo.acao === 'proxima') {
		const resultado = proximaEtapa(sala);
		return resultado.erro ? json({ erro: resultado.erro }, { status: 400 }) : json({ ok: true });
	}
	if (corpo.acao === 'encerrar') {
		const resultado = encerrarSala(sala);
		return resultado.erro ? json({ erro: resultado.erro }, { status: 400 }) : json({ ok: true });
	}
	if (corpo.acao === 'sair') {
		removerSala(params.codigo);
		return json({ ok: true });
	}

	return json({ erro: 'Ação desconhecida.' }, { status: 400 });
};
