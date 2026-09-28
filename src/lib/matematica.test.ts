import { describe, it, expect } from 'vitest';
import { partesMatematicas, temMatematica } from './matematica';

describe('partesMatematicas', () => {
	it('separa o texto em torno de $...$', () => {
		expect(partesMatematicas('a área é $x^2$ do total')).toEqual([
			{ tipo: 'texto', valor: 'a área é ' },
			{ tipo: 'latex', valor: 'x^2' },
			{ tipo: 'texto', valor: ' do total' }
		]);
	});

	it('aceita vários trechos e fórmula no começo ou no fim', () => {
		expect(partesMatematicas('$a$ e $b$')).toEqual([
			{ tipo: 'latex', valor: 'a' },
			{ tipo: 'texto', valor: ' e ' },
			{ tipo: 'latex', valor: 'b' }
		]);
		expect(partesMatematicas('$\\frac{1}{2}$')).toEqual([{ tipo: 'latex', valor: '\\frac{1}{2}' }]);
	});

	it('não trata $ solto, vazio ou com quebra de linha como fórmula', () => {
		expect(partesMatematicas('custa $ 5')).toEqual([{ tipo: 'texto', valor: 'custa $ 5' }]);
		expect(partesMatematicas('$$')).toEqual([{ tipo: 'texto', valor: '$$' }]);
		expect(partesMatematicas('a $x\ny$ b')).toEqual([{ tipo: 'texto', valor: 'a $x\ny$ b' }]);
	});

	it('devolve o texto inteiro quando não há fórmula', () => {
		expect(partesMatematicas('só texto')).toEqual([{ tipo: 'texto', valor: 'só texto' }]);
		expect(partesMatematicas('')).toEqual([]);
	});

	it('temMatematica diz se vale renderizar com KaTeX', () => {
		expect(temMatematica('$x$')).toBe(true);
		expect(temMatematica('sem fórmula')).toBe(false);
		expect(temMatematica('só $')).toBe(false);
	});
});
