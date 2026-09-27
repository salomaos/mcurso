import { describe, it, expect } from 'vitest';
import {
	agruparPorSecao,
	ehBloco,
	mesmoNomeSecao,
	normalizarBlocos,
	normalizarNomeSecao,
	criarBloco,
	type AulaUi,
	type SecaoUi
} from './blocks';

function aula(id: number, titulo: string, secaoId: number | null): AulaUi {
	return { id, apostilaId: 1, titulo, secaoId, descricao: null, ordem: id };
}

function secao(id: number, nome: string, ordem: number): SecaoUi {
	return { id, apostilaId: 1, nome, ordem };
}

describe('agruparPorSecao', () => {
	const secoes = [secao(1, 'Bloco A', 0), secao(2, 'Bloco B', 1), secao(3, 'Bloco vazio', 2)];
	const aulas = [
		aula(1, 'aula 1', 1),
		aula(2, 'aula 2', 1),
		aula(3, 'aula 3', 2),
		aula(4, 'aula 4', null)
	];

	it('agrupa por seção do catálogo, não por trechos consecutivos', () => {
		const grupos = agruparPorSecao(secoes, aulas);
		expect(grupos.map((g) => g.secao?.nome ?? null)).toEqual(['Bloco A', 'Bloco B', null]);
		expect(grupos[0].aulas.map((a) => a.id)).toEqual([1, 2]);
		expect(grupos[2].aulas.map((a) => a.id)).toEqual([4]);
	});

	it('seções intercaladas ficam no mesmo grupo, na ordem do catálogo', () => {
		const intercaladas = [aula(1, 'x', 1), aula(2, 'y', 2), aula(3, 'z', 1)];
		const grupos = agruparPorSecao([secao(1, 'A', 1), secao(2, 'B', 0)], intercaladas);
		expect(grupos.map((g) => g.secao?.nome)).toEqual(['B', 'A']);
		expect(grupos[1].aulas.map((a) => a.id)).toEqual([1, 3]);
	});

	it('omite seções sem aulas e mantém as demais ordenadas', () => {
		const grupos = agruparPorSecao(secoes, aulas);
		expect(grupos.some((g) => g.secao?.nome === 'Bloco vazio')).toBe(false);
	});

	it('seção inexistente na lista cai em "sem seção"', () => {
		const grupos = agruparPorSecao([], [aula(9, 'órfã', 99)]);
		expect(grupos).toHaveLength(1);
		expect(grupos[0].secao).toBeNull();
	});

	it('sem aulas de(section) nenhuma não gera grupo "sem seção"', () => {
		const grupos = agruparPorSecao(secoes, [aula(1, 'aula 1', 1)]);
		expect(grupos).toHaveLength(1);
		expect(grupos[0].secao?.nome).toBe('Bloco A');
	});
});

describe('normalizarNomeSecao / mesmoNomeSecao', () => {
	it('colapsa espaços e limita o tamanho', () => {
		expect(normalizarNomeSecao('  Bloco   1  ')).toBe('Bloco 1');
		expect(normalizarNomeSecao('a'.repeat(80))).toHaveLength(60);
		expect(normalizarNomeSecao('   ')).toBe('');
		expect(normalizarNomeSecao(null)).toBe('');
	});

	it('compara nomes ignorando caixa e acentos', () => {
		expect(mesmoNomeSecao('Bloco 1', 'bloco 1')).toBe(true);
		expect(mesmoNomeSecao('Programação', 'programacao')).toBe(true);
		expect(mesmoNomeSecao('Bloco 1', 'Bloco 2')).toBe(false);
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

	it('exige os campos do tipo declarado', () => {
		expect(ehBloco({ id: 't', tipo: 'texto', diagrama: 'A --> B' })).toBe(false);
		expect(ehBloco({ id: 'm', tipo: 'mermaid', conteudo: 'A --> B' })).toBe(false);
		expect(ehBloco({ id: 'c', tipo: 'codigo', codigo: 'const x = 1' })).toBe(false);
		expect(ehBloco({ id: 't', tipo: 'titulo', texto: 'Título', nivel: '2' })).toBe(false);
	});

	it('rejeita URLs de link inseguras', () => {
		expect(
			ehBloco({ id: 'l', tipo: 'link', rotulo: 'Abrir', tipoLink: 'externo', url: 'javascript:alert(1)' })
		).toBe(false);
		expect(
			ehBloco({ id: 'l', tipo: 'link', rotulo: 'Anexo', tipoLink: 'anexo', url: '/uploads/aula.pdf' })
		).toBe(true);
	});

	it('normaliza JSON não-array para lista vazia', () => {
		expect(normalizarBlocos('não é array')).toEqual([]);
		expect(normalizarBlocos(null)).toEqual([]);
	});

	it('aceita os novos tipos (tabela, formula, exercicio)', () => {
		const blocos = [criarBloco('tabela'), criarBloco('formula'), criarBloco('exercicio')];
		const limpos = normalizarBlocos(blocos);
		expect(limpos).toHaveLength(3);
		expect(limpos.every((b) => ehBloco(b))).toBe(true);
	});

	it('reforça campos opcionais dos novos tipos', () => {
		const limpos = normalizarBlocos([
			{ id: 't', tipo: 'tabela', cabecalho: ['a'], linhas: [['1']] },
			{ id: 'f', tipo: 'formula', latex: 'x^2', destaque: false },
			{ id: 'e', tipo: 'exercicio', pergunta: 'q', alternativas: ['a', 'b'], correta: 1, explicacao: null }
		]);
		expect(limpos[0]).toEqual({ id: 't', tipo: 'tabela', cabecalho: ['a'], linhas: [['1']] });
		expect(limpos[1]).toMatchObject({ tipo: 'formula', latex: 'x^2', destaque: false });
		expect(limpos[2]).toMatchObject({ tipo: 'exercicio', correta: 1 });
		expect((limpos[2] as { explicacao?: string }).explicacao).toBeUndefined();
	});

	it('descarta tabela com linhas não-array', () => {
		const sujo = [{ id: 't', tipo: 'tabela', cabecalho: ['a'], linhas: [['1'], 'não-linha'] }];
		expect(normalizarBlocos(sujo)).toEqual([]);
	});

	it('rejeita exercicio sem alternativas ou correta inválida', () => {
		expect(ehBloco({ id: 'e', tipo: 'exercicio', pergunta: 'q', alternativas: [], correta: 0 })).toBe(false);
		expect(ehBloco({ id: 'e', tipo: 'exercicio', pergunta: 'q', alternativas: ['a', 'b'], correta: 5 })).toBe(false);
		expect(ehBloco({ id: 'f', tipo: 'formula', latex: '' })).toBe(true);
	});
});