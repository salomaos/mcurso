// Acesso à API da sala a partir das telas (professor e aluno). Tudo por `fetch`:
// o fluxo de tempo real não usa form action (a URL da ação `?/x` apagaria o `?j=`
// que identifica o jogador).

import type { EstadoQuiz } from '$lib/quiz';

export type AcaoSala =
	| { acao: 'iniciar' }
	| { acao: 'proxima' }
	| { acao: 'encerrar' }
	| { acao: 'sair' }
	| { acao: 'responder'; jogadorId: string; indice: number };

function urlSala(codigo: string, jogadorId?: string): string {
	const url = new URL(`/api/quiz/sala/${encodeURIComponent(codigo)}`, location.origin);
	if (jogadorId) url.searchParams.set('j', jogadorId);
	return url.toString();
}

export async function buscarEstado(codigo: string, jogadorId?: string): Promise<EstadoQuiz> {
	const resposta = await fetch(urlSala(codigo, jogadorId), {
		headers: { accept: 'application/json' },
		cache: 'no-store'
	});
	if (!resposta.ok) {
		const dados = (await resposta.json().catch(() => ({}))) as { erro?: string };
		throw new Error(dados.erro ?? 'Não foi possível ler a sala.');
	}
	return (await resposta.json()) as EstadoQuiz;
}

export async function enviarAcao(codigo: string, corpo: AcaoSala): Promise<{ correta?: boolean; pontos?: number }> {
	const resposta = await fetch(urlSala(codigo), {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(corpo)
	});
	if (!resposta.ok) {
		const dados = (await resposta.json().catch(() => ({}))) as { erro?: string };
		throw new Error(dados.erro ?? 'Não foi possível completar a ação.');
	}
	return (await resposta.json()) as { correta?: boolean; pontos?: number };
}
