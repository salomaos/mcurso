import { describe, it, expect } from 'vitest';
import {
	agruparPorSecao,
	corretasDoExercicio,
	ehBloco,
	hrefLinkInterno,
	linksPara,
	mesmoNomeSecao,
	normalizarBlocos,
	normalizarNomeSecao,
	criarBloco,
	TIPOS_BLOCO,
	type AulaUi,
	type SecaoUi
} from './blocks';
import { FORMAS_ICONE } from './icones';

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

	it('normaliza o tema do mermaid, mantendo o de bloco antigo sem o campo', () => {
		const [novo] = normalizarBlocos([criarBloco('mermaid')]);
		expect(novo.tipo === 'mermaid' && novo.tema).toBe('neutral');

		const [antigo] = normalizarBlocos([{ id: 'm', tipo: 'mermaid', diagrama: 'A --> B' }]);
		expect(antigo.tipo === 'mermaid' && antigo.tema).toBe('neutral');

		const [escolhido] = normalizarBlocos([
			{ id: 'm', tipo: 'mermaid', diagrama: 'A --> B', tema: 'forest' }
		]);
		expect(escolhido.tipo === 'mermaid' && escolhido.tema).toBe('forest');

		const [invalido] = normalizarBlocos([
			{ id: 'm', tipo: 'mermaid', diagrama: 'A --> B', tema: 'saia-da-lua' }
		]);
		expect(invalido.tipo === 'mermaid' && invalido.tema).toBe('neutral');
		expect(invalido.tipo === 'mermaid' && invalido.diagrama).toBe('A --> B');
	});

	it('rejeita URLs de link inseguras', () => {
		expect(
			ehBloco({ id: 'l', tipo: 'link', rotulo: 'Abrir', tipoLink: 'externo', url: 'javascript:alert(1)' })
		).toBe(false);
	});

	it('exige alvo em link de conteúdo e aceita o aulaId legado', () => {
		expect(
			ehBloco({ id: 'l', tipo: 'link', rotulo: 'Anexo', tipoLink: 'anexo', url: '/uploads/aula.pdf' })
		).toBe(false);
		expect(
			ehBloco({ id: 'l', tipo: 'link', rotulo: 'Anexo', tipoLink: 'anexo', alvoId: 7 })
		).toBe(true);
		expect(
			ehBloco({ id: 'l', tipo: 'link', rotulo: 'Aula', tipoLink: 'aula', aulaId: 3 })
		).toBe(true);
	});

	it('normaliza o aulaId legado para alvoId', () => {
		const [bloco] = normalizarBlocos([
			{ id: 'l', tipo: 'link', rotulo: 'Aula 1', tipoLink: 'aula', aulaId: 3, url: 'x' }
		]);
		expect(bloco).toEqual({ id: 'l', tipo: 'link', rotulo: 'Aula 1', tipoLink: 'aula', alvoId: 3 });
	});

	it('descarta o alvoApostilaId: anexo é solto e aula vive na apostila do bloco', () => {
		const [bloco] = normalizarBlocos([
			{ id: 'l', tipo: 'link', rotulo: 'Anexo', tipoLink: 'anexo', alvoId: 9, alvoApostilaId: 4 }
		]);
		expect(bloco).toEqual({ id: 'l', tipo: 'link', rotulo: 'Anexo', tipoLink: 'anexo', alvoId: 9 });
	});

	it('normaliza JSON não-array para lista vazia', () => {
		expect(normalizarBlocos('não é array')).toEqual([]);
		expect(normalizarBlocos(null)).toEqual([]);
	});

	it('aceita os novos tipos (tabela, formula, exercicio, dissertativa)', () => {
		const blocos = [
			criarBloco('tabela'),
			criarBloco('formula'),
			criarBloco('exercicio'),
			criarBloco('dissertativa')
		];
		const limpos = normalizarBlocos(blocos);
		expect(limpos).toHaveLength(4);
		expect(limpos.every((b) => ehBloco(b))).toBe(true);
	});

	it('reforça campos opcionais dos novos tipos', () => {
		const limpos = normalizarBlocos([
			{ id: 't', tipo: 'tabela', cabecalho: ['a'], linhas: [['1']] },
			{ id: 'f', tipo: 'formula', latex: 'x^2', destaque: false },
			{ id: 'e', tipo: 'exercicio', pergunta: 'q', alternativas: ['a', 'b'], correta: 1, explicacao: null },
			{ id: 'd', tipo: 'dissertativa', pergunta: 'explique', orientacao: null }
		]);
		expect(limpos[0]).toEqual({ id: 't', tipo: 'tabela', cabecalho: ['a'], linhas: [['1']] });
		expect(limpos[1]).toMatchObject({ tipo: 'formula', latex: 'x^2', destaque: false });
		expect(limpos[2]).toMatchObject({ tipo: 'exercicio', correta: 1, selecao: 'radio' });
		expect((limpos[2] as { explicacao?: string }).explicacao).toBeUndefined();
		expect(limpos[3]).toEqual({ id: 'd', tipo: 'dissertativa', pergunta: 'explique' });
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

describe('seleção do exercício', () => {
	const base = { id: 'e', tipo: 'exercicio', pergunta: 'q', alternativas: ['a', 'b', 'c'] };

	it('checkbox aceita várias corretas e recusa lista vazia ou inválida', () => {
		expect(ehBloco({ ...base, selecao: 'checkbox', correta: [0, 2] })).toBe(true);
		expect(ehBloco({ ...base, selecao: 'checkbox', correta: [] })).toBe(false);
		expect(ehBloco({ ...base, selecao: 'checkbox', correta: [0, 9] })).toBe(false);
		expect(ehBloco({ ...base, selecao: 'checkbox', correta: 'a' })).toBe(false);
	});

	it('checkbox com `correta` numérica vira lista de um item', () => {
		const [bloco] = normalizarBlocos([{ ...base, selecao: 'checkbox', correta: 2 }]);
		expect(bloco).toMatchObject({ selecao: 'checkbox', correta: [2] });
	});

	it('normaliza `correta` no formato da modalidade escolhida', () => {
		const [checkbox] = normalizarBlocos([{ ...base, selecao: 'checkbox', correta: [2, 0] }]);
		expect(checkbox).toMatchObject({ selecao: 'checkbox', correta: [0, 2] });

		const [radio] = normalizarBlocos([{ ...base, selecao: 'radio', correta: [2, 0] }]);
		expect(radio).toMatchObject({ selecao: 'radio', correta: 0 });
	});

	it('saneia campo ausente ou desconhecido para rádio', () => {
		const [antigo] = normalizarBlocos([{ ...base, correta: 1 }]);
		expect(antigo).toMatchObject({ selecao: 'radio', correta: 1 });
		const [lixo] = normalizarBlocos([{ ...base, selecao: 'qualquer', correta: 1 }]);
		expect(lixo).toMatchObject({ selecao: 'radio', correta: 1 });
	});

	it('descarta checkbox sem nenhuma alternativa correta', () => {
		expect(normalizarBlocos([{ ...base, selecao: 'checkbox', correta: [] }])).toEqual([]);
	});

	it('corretasDoExercicio ordena, deduplica e descarta índice fora da faixa', () => {
		expect(corretasDoExercicio({ alternativas: ['a', 'b', 'c'], correta: [2, 0, 2] })).toEqual([0, 2]);
		expect(corretasDoExercicio({ alternativas: ['a', 'b'], correta: 1 })).toEqual([1]);
		expect(corretasDoExercicio({ alternativas: ['a', 'b'], correta: [7] })).toEqual([]);
	});
});

describe('hrefLinkInterno', () => {
	it('monta a rota de aula na apostila do bloco', () => {
		const bloco = normalizarBlocos([
			{ id: 'l', tipo: 'link', rotulo: 'A', tipoLink: 'aula', alvoId: 5 }
		])[0];
		expect(hrefLinkInterno(bloco as never, 1)).toBe('/apostilas/1/aulas/5');
	});

	it('monta a rota de anexo em /anexos, sem apostila', () => {
		const bloco = normalizarBlocos([
			{ id: 'l', tipo: 'link', rotulo: 'A', tipoLink: 'anexo', alvoId: 5 }
		])[0];
		expect(hrefLinkInterno(bloco as never, 1)).toBe('/anexos/5');
		expect(hrefLinkInterno(bloco as never, 1, '/e2e')).toBe('/anexos/5');
	});

	it('monta a rota de atividade e leva a aula de contexto na query', () => {
		const bloco = normalizarBlocos([
			{ id: 'l', tipo: 'link', rotulo: 'A', tipoLink: 'exercicio', alvoId: 9 }
		])[0];
		expect(hrefLinkInterno(bloco as never, 1)).toBe('/exercicios/9');
		expect(hrefLinkInterno(bloco as never, 1, '/apostilas', 4)).toBe('/exercicios/9?aula=4');
	});

	it('não monta link de aula sem apostila no contexto (dentro de um anexo)', () => {
		const bloco = normalizarBlocos([
			{ id: 'l', tipo: 'link', rotulo: 'A', tipoLink: 'aula', alvoId: 5 }
		])[0];
		expect(hrefLinkInterno(bloco as never, undefined)).toBeNull();
	});

	it('devolve null para link externo ou sem alvo', () => {
		const externo = normalizarBlocos([
			{ id: 'l', tipo: 'link', rotulo: 'E', tipoLink: 'externo', url: 'https://x.dev' }
		])[0];
		expect(hrefLinkInterno(externo as never, 1)).toBeNull();
		expect(hrefLinkInterno({ id: 'l', tipo: 'link', rotulo: 'E', tipoLink: 'anexo' }, 1)).toBeNull();
		expect(normalizarBlocos([{ id: 'l', tipo: 'link', rotulo: 'E', tipoLink: 'anexo' }])).toEqual([]);
	});
});

describe('linksPara', () => {
	it('acha só os blocos do tipo certo que apontam para o conteúdo', () => {
		const blocos = normalizarBlocos([
			{ id: 'a', tipo: 'link', rotulo: 'alvo', tipoLink: 'anexo', alvoId: 7 },
			{ id: 'b', tipo: 'link', rotulo: 'outro', tipoLink: 'anexo', alvoId: 8 },
			{ id: 'c', tipo: 'link', rotulo: 'ext', tipoLink: 'externo', url: 'https://x.dev' },
			{ id: 'd', tipo: 'link', rotulo: 'legado', tipoLink: 'aula', aulaId: 7 },
			{ id: 'f', tipo: 'link', rotulo: 'atividade', tipoLink: 'exercicio', alvoId: 7 },
			{ id: 'e', tipo: 'texto', conteudo: 'oi' }
		]);
		expect(linksPara(blocos, { tipo: 'anexo', id: 7 }).map((b) => b.id)).toEqual(['a']);
		expect(linksPara(blocos, { tipo: 'aula', id: 7 }).map((b) => b.id)).toEqual(['d']);
		expect(linksPara(blocos, { tipo: 'exercicio', id: 7 }).map((b) => b.id)).toEqual(['f']);
	});
});

describe('TIPOS_BLOCO', () => {
	it('tem um ícone desenhado para cada tipo de bloco', () => {
		for (const tipo of TIPOS_BLOCO) {
			expect(FORMAS_ICONE[tipo.icone], `ícone de ${tipo.rotulo}`).toBeDefined();
			expect(FORMAS_ICONE[tipo.icone].length).toBeGreaterThan(0);
		}
	});

	it('cobre todos os tipos que o editor sabe criar', () => {
		const icones = TIPOS_BLOCO.map((tipo) => tipo.icone);
		expect(new Set(icones).size).toBe(icones.length);
		// Ícone pode existir sem ser de bloco (ações, ex.: o `mais` da faixa de
		// inserção), mas nenhum bloco pode ficar sem o seu.
		const desenhados = Object.keys(FORMAS_ICONE);
		for (const icone of icones) expect(desenhados).toContain(icone);
	});
});