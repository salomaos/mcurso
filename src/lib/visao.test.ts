import { describe, it, expect } from 'vitest';
import { VISCOES, VISAO_PADRAO, CHAVE_VISAO, resolverVisao } from './visao.svelte';

describe('resolverVisao', () => {
	it('devolve a visão salva quando é válida', () => {
		for (const visao of VISCOES) {
			expect(resolverVisao(visao)).toBe(visao);
		}
	});

	it('cai no padrão quando não há valor ou o valor é inválido', () => {
		expect(resolverVisao(null)).toBe(VISAO_PADRAO);
		expect(resolverVisao(undefined)).toBe(VISAO_PADRAO);
		expect(resolverVisao('')).toBe(VISAO_PADRAO);
		expect(resolverVisao('colunas')).toBe(VISAO_PADRAO);
		expect(resolverVisao('GRADE')).toBe(VISAO_PADRAO);
	});

	it('o padrão é a lista, que é a cara das listas de aulas', () => {
		expect(VISAO_PADRAO).toBe('lista');
	});

	it('a chave é do app, com namespace, para não colidir com a da lib', () => {
		expect(CHAVE_VISAO).toBe('mcurso:visao');
	});
});
