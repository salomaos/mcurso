// Store de tema sincronizada com o helper AHMAR (ahmardesign).
// Só roda no cliente (onMount) — nunca no SSR.
// A chave é a mesma da lib (`ahmar-theme`): o app.html aplica o valor salvo no
// <body> antes da primeira pintura, então os dois lados precisam ler a mesma chave.

import { browser } from '$app/environment';

export const TEMAS = [
	'light',
	'dark',
	'cupcake',
	'retro',
	'cyberpunk',
	'synthwave',
	'aqua',
	'valentine',
	'brutalist',
	'brutalist-dark'
] as const;

export type Tema = (typeof TEMAS)[number];

export const CHAVE_TEMA = 'ahmar-theme';
export const TEMA_PADRAO: Tema = 'brutalist';

let tema = $state<Tema>(TEMA_PADRAO);

export function getTema(): Tema {
	return tema;
}

export function resolverTema(valor: string | null | undefined): Tema {
	return valor && (TEMAS as readonly string[]).includes(valor) ? (valor as Tema) : TEMA_PADRAO;
}

export function definirTema(novo: Tema) {
	tema = novo;
	if (!browser) return;
	window.AHMAR?.setTheme(novo);
	document.body.setAttribute('data-theme', novo);
	try {
		localStorage.setItem(CHAVE_TEMA, novo);
	} catch {
		// sem localStorage (modo privado) — tema vale só para a sessão
	}
}

function temaSalvo(): string | null {
	try {
		return localStorage.getItem(CHAVE_TEMA);
	} catch {
		return null;
	}
}

// Carrega o tema salvo, aplica e sincroniza com os eventos do AHMAR.
export function iniciarTema() {
	if (!browser) return;

	definirTema(resolverTema(temaSalvo()));

	window.addEventListener('ahmar-theme-change', (e) => {
		const detail = (e as CustomEvent<{ theme: Tema }>).detail;
		if (detail?.theme && (TEMAS as readonly string[]).includes(detail.theme)) {
			tema = detail.theme;
		}
	});
}
