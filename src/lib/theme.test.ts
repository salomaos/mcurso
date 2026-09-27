import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { TEMAS, TEMA_PADRAO, CHAVE_TEMA, resolverTema } from './theme.svelte';

describe('resolverTema', () => {
	it('devolve o tema salvo quando é válido', () => {
		for (const tema of TEMAS) {
			expect(resolverTema(tema)).toBe(tema);
		}
	});

	it('cai no padrão quando não há valor ou o valor é inválido', () => {
		expect(resolverTema(null)).toBe(TEMA_PADRAO);
		expect(resolverTema(undefined)).toBe(TEMA_PADRAO);
		expect(resolverTema('')).toBe(TEMA_PADRAO);
		expect(resolverTema('nao-existe')).toBe(TEMA_PADRAO);
		expect(resolverTema('BRUTALIST')).toBe(TEMA_PADRAO);
	});
});

describe('tema no app.html', () => {
	const html = fs.readFileSync(path.resolve('src/app.html'), 'utf8');
	const lista = html.match(/'([a-z-]+(?: [a-z-]+)*)'\.split\(/)?.[1]?.split(' ') ?? [];

	it('aplica o tema salvo antes do conteúdo do body', () => {
		expect(html.indexOf("getItem('ahmar-theme')")).toBeLessThan(html.indexOf('%sveltekit.body%'));
	});

	it('aceita exatamente os temas do seletor', () => {
		expect([...lista].sort()).toEqual([...TEMAS].sort());
	});

	it('usa a mesma chave que o store', () => {
		expect(html).toContain(`getItem('${CHAVE_TEMA}')`);
	});
});
