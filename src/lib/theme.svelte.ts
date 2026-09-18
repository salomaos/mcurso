// Store de tema sincronizada com o helper AHMAR (ahmardesign).
// Só roda no cliente (onMount) — nunca no SSR.

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

const STORAGE_KEY = 'mcurso:tema';
const PADRAO: Tema = 'brutalist';

let tema = $state<Tema>(PADRAO);

export function getTema(): Tema {
	return tema;
}

export function definirTema(novo: Tema) {
	tema = novo;
	if (!browser) return;
	window.AHMAR?.setTheme(novo);
	try {
		localStorage.setItem(STORAGE_KEY, novo);
	} catch {
		// sem localStorage (modo privado) — tema vale só para a sessão
	}
}

// Carrega o tema salvo, aplica e sincroniza com os eventos do AHMAR.
export function iniciarTema() {
	if (!browser) return;

	let salvo: Tema = PADRAO;
	try {
		const v = localStorage.getItem(STORAGE_KEY);
		if (v && (TEMAS as readonly string[]).includes(v)) salvo = v as Tema;
	} catch {
		// usa o padrão
	}
	definirTema(salvo);

	window.addEventListener('ahmar-theme-change', (e) => {
		const detail = (e as CustomEvent<{ theme: Tema }>).detail;
		if (detail?.theme && (TEMAS as readonly string[]).includes(detail.theme)) {
			tema = detail.theme;
		}
	});
}