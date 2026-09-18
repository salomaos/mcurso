import { describe, it, expect } from 'vitest';
import { agruparPorSecao, ehBloco, normalizarBlocos, criarBloco, type AulaUi } from './blocks';

function aula(id: number, titulo: string, secao: string | null): AulaUi {
	return { id, apostilaId: 1, titulo, secao, descricao: null, ordem: id };
}

describe('agruparPorSecao', () => {
	const aulas = [
		aula(1, 'aula 1', 'Bloco A'),
		aula(2, 'aula 2', 'Bloco A'),
		aula(3, 'aula 3', 'Bloco B'),
		aula(4, 'aula 4', null)
	];

	it('agrupa aulas consecutivas da mesma seção', () => {
		const grupos = agruparPorSecao(aulas);
		expect(grupos.map((g) => g.secao)).toEqual(['Bloco A', 'Bloco B', null]);
		expect(grupos[0].aulas.map((a) => a.id)).toEqual([1, 2]);
		expect(grupos[2].aulas.map((a) => a.id)).toEqual([4]);
	});

	it('preserva a ordem dentro de cada seção', () => {
		const grupos = agruparPorSecao(aulas);
		expect(grupos[1].aulas[0].id).toBe(3);
	});

	it('seções intercaladas viram grupos separados', () => {
		const intercaladas = [
			aula(1, 'x', 'A'),
			aula(2, 'y', 'B'),
			aula(3, 'z', 'A')
		];
		const grupos = agruparPorSecao(intercaladas);
		expect(grupos).toHaveLength(3);
	});
});

describe('normalizarBlocos / ehBloco', () => {
	it('aceita blocos válidos', () => {
		const blocos = [criarBloco('texto'), criarBloco('codigo'), criarBloco('mermaid')];
		expect(normalizarBlocos(blocos)).toHaveLength(3);
	});

	it('descarta entradas inválidas', () => {
		const sujo = [criarBloco('titulo'), { id: 1 }, null, 'texto', { tipo: 'texto' }];
		const limpos = normalizarBlocos(sujo);
		expect(limpos).toHaveLength(1);
		expect(limpos[0].tipo).toBe('titulo');
	});

	it('ehBloco rejeita tipos desconhecidos', () => {
		expect(ehBloco({ id: 'a', tipo: 'video', url: 'x' })).toBe(false);
		expect(ehBloco(criarBloco('imagem'))).toBe(true);
	});

	it('normaliza JSON não-array para lista vazia', () => {
		expect(normalizarBlocos('não é array')).toEqual([]);
		expect(normalizarBlocos(null)).toEqual([]);
	});
});