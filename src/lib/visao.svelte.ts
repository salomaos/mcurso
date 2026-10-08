// Preferência de visualização das listas de conteúdo (lista ou grade).
// Só roda no cliente (onMount) — nunca no SSR.
//
// A chave é do app (`mcurso:visao`), não da lib: o seletor de tema já guarda a
// preferência da biblioteca e as duas coisas não precisam concordar. Não há FOUC
// aqui (ao contrário do tema): trocar lista por grade depois da primeira pintura
// só reposiciona cartões, não muda cor nem fonte.

import { browser } from '$app/environment';

export const VISCOES = ['lista', 'grade'] as const;

export type Visao = (typeof VISCOES)[number];

export const CHAVE_VISAO = 'mcurso:visao';
/**
 * `lista` é o padrão porque é a cara das listas de aulas/anexos/atividades
 * (o arrasto e a leitura de descrições longas dependem da linha inteira) e é
 * também o que o arrasto de aulas espera.
 */
export const VISAO_PADRAO: Visao = 'lista';

let visao = $state<Visao>(VISAO_PADRAO);

export function getVisao(): Visao {
	return visao;
}

export function resolverVisao(valor: string | null | undefined): Visao {
	return valor && (VISCOES as readonly string[]).includes(valor) ? (valor as Visao) : VISAO_PADRAO;
}

export function definirVisao(nova: Visao) {
	visao = resolverVisao(nova);
	if (!browser) return;
	try {
		localStorage.setItem(CHAVE_VISAO, visao);
	} catch {
		// sem localStorage (modo privado) — a visão vale só para a sessão
	}
}

function visaoSalva(): string | null {
	try {
		return localStorage.getItem(CHAVE_VISAO);
	} catch {
		return null;
	}
}

/** Classe do container da lista. Vale para o `ul` dos cartões com ações e para o
 *  `div` dos cartões que são link (`display: grid` funciona nos dois). */
export function classeLista(modo: Visao): string {
	return modo === 'lista' ? 'space-y-2' : 'grid gap-4 sm:grid-cols-2';
}

/** Carrega a visão salva. Idempotente, então chamar de novo não faz mal. */
export function iniciarVisao() {
	if (!browser) return;
	visao = resolverVisao(visaoSalva());
}
