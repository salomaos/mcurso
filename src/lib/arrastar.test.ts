import { describe, expect, it } from 'vitest';
import { moverItem } from './arrastar';

describe('moverItem', () => {
	it('move um item para o início', () => {
		expect(moverItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
	});

	it('move um item para o fim', () => {
		expect(moverItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
	});

	it('move um item para o meio', () => {
		expect(moverItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
	});

	it('ignora índices fora da lista', () => {
		expect(moverItem(['a', 'b'], -1, 0)).toEqual(['a', 'b']);
		expect(moverItem(['a', 'b'], 5, 0)).toEqual(['a', 'b']);
	});

	it('limita o destino ao tamanho da lista', () => {
		expect(moverItem(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a']);
		expect(moverItem(['a', 'b', 'c'], 2, -5)).toEqual(['c', 'a', 'b']);
	});

	it('não altera a lista original', () => {
		const original = ['a', 'b', 'c'];
		moverItem(original, 0, 2);
		expect(original).toEqual(['a', 'b', 'c']);
	});

	it('funciona com objetos', () => {
		const lista = [
			{ id: 1, secaoId: null },
			{ id: 2, secaoId: 7 }
		];
		expect(moverItem(lista, 0, 1)).toEqual([
			{ id: 2, secaoId: 7 },
			{ id: 1, secaoId: null }
		]);
	});
});
