import { building } from '$app/environment';
import type { HandleServerError } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { auth } from '$lib/server/auth';
import { log } from '$lib/server/log';
import '$lib/server/observabilidade';

// Assets servidos pelo app: não geram linha de request log (uma página com
// vinte imagens viraria vinte linhas). Erros desses caminhos seguem indo ao
// `handleError`, que loga a exceção com stack.
const PREFIXOS_SILENCIOSOS = ['/_app/', '/uploads/', '/lib/', '/audio/', '/favicon'];

// Uma requisição muito lenta é sintoma de servidor sufocando (CPU/banco no
// limite) — aparece bem antes de qualquer queda, então sai no warn.
const LENTA_MS = 5000;

// Erros são agregados por assinatura (método + rota + status): a primeira
// ocorrência sai na hora; repetições dentro da janela acumulam e viram uma
// linha com a contagem na primeira ocorrência seguinte à janela. Sem isso,
// quando a sala cai, o 404 de cada aluno a cada 1s enche o painel da
// hospedagem em minutos e empurra para fora da janela de exibição as linhas
// do que aconteceu **antes** da queda. O que importa no diagnóstico — quando o
// erro começou e quando parou (o silêncio depois) — fica em uma linha por
// minuto. O Map tem teto: fuzzing de rotas não pode crescer ele para sempre.
const JANELA_ERRO_MS = 60 * 1000;
const LIMITE_ASSINATURAS = 500;
const errosAgregados = new Map<string, { total: number; expiraEm: number }>();

function erroAgregado(assinatura: string, linha: string) {
	const agora = Date.now();
	const anterior = errosAgregados.get(assinatura);
	if (anterior && agora < anterior.expiraEm) {
		anterior.total += 1;
		return;
	}
	if (anterior) log.error(`${linha} — ${anterior.total} erro(s) repetido(s) no minuto anterior`);
	if (errosAgregados.size >= LIMITE_ASSINATURAS) errosAgregados.clear();
	errosAgregados.set(assinatura, { total: 1, expiraEm: agora + JANELA_ERRO_MS });
	log.error(linha);
}

export async function handle({ event, resolve }) {
	// O aluno do quiz se identifica por `?j=` e a API não usa a sessão nesse ramo
	// (GET com jogador na query). Pular a resolução do Better Auth corta uma
	// consulta no banco a cada request — com uma turma inteira pollando ~1x/s,
	// é a diferença entre o app aguentar e a hospedagem sufocar. O professor
	// (mesmo path, sem `j`) e o POST do aluno (`jogadorId` no corpo, `j` ausente
	// da query) continuam resolvendo a sessão normalmente.
	if (event.url.pathname.startsWith('/api/quiz/sala/') && event.url.searchParams.has('j')) {
		event.locals.session = null;
		event.locals.user = null;
	} else {
		const session = await auth.api.getSession({ headers: event.request.headers });
		event.locals.session = session?.session ?? null;
		event.locals.user = session?.user ?? null;
	}

	// O `j` do quiz é um UUID por aluno: em toda linha polui e não informa nada
	// (a sala já está no path). Redigido (`?j=…`), os erros de uma sala caída
	// caem numa assinatura só — a contagem da agregação é por sala.
	const alvo = event.url.pathname + event.url.search.replace(/([?&]j=)[^&]+/g, '$1…');

	const inicio = performance.now();
	const resposta = await svelteKitHandler({ event, resolve, auth, building });
	logarRequest(event.request.method, alvo, resposta.status, performance.now() - inicio);
	return resposta;
}

function logarRequest(metodo: string, alvo: string, status: number, duracaoMs: number) {
	// O polling do quiz (~1 req/s por aluno) é o volume do app: quem conta o
	// estado da partida é o heartbeat da sala, não cada request. Erros (≥ 400)
	// sempre saem — inclusive o 404 de "sala não encontrada", o sinal de sala
	// caída ou de request barrado antes do app.
	if (status < 400) {
		if (metodo === 'GET' && alvo.startsWith('/api/quiz/sala/')) return;
		for (const prefixo of PREFIXOS_SILENCIOSOS) if (alvo.startsWith(prefixo)) return;
		const linha = `${metodo} ${alvo} ${status} ${Math.round(duracaoMs)}ms`;
		if (duracaoMs >= LENTA_MS) log.warn(`${linha} — lenta`);
		else log.info(linha);
		return;
	}
	if (alvo === '/favicon.ico') return; // silenciado no `handleError` também
	erroAgregado(`${metodo} ${alvo} ${status}`, `${metodo} ${alvo} ${status} ${Math.round(duracaoMs)}ms`);
}

// `handleError` substitui o log padrão do SvelteKit, então ele loga os dois: o erro
// de fora e a **causa**. E é a causa que importa: o erro do drizzle sai como
// "Failed query: ..." e o código do MySQL (PROTOCOL_CONNECTION_LOST,
// ER_ACCESS_DENIED, ER_NO_SUCH_TABLE...) fica em `error.cause`, que o log padrão não
// mostra. Sem isso, um 500 no deploy vira adivinhação — foi o que aconteceu em
// 18/10/2026, com o app inteiro em 500 sem dizer por quê.
export const handleError: HandleServerError = ({ error, event, status, message }) => {
	// O browser pede /favicon.ico por hábito e o app só tem favicon.svg — ruído
	// puro, sem nenhuma informação útil para o painel de logs.
	if (status === 404 && event.url.pathname === '/favicon.ico') return { message };

	log.error(`${status} ${event.request.method} ${event.url.pathname}`);

	if (error instanceof Error) {
		log.error(error.stack ?? error.message);

		if (error.cause) {
			log.error('causa:', error.cause);
		}
	} else {
		log.error(error);
	}

	return { message };
};
