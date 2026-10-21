import { describe, it, expect } from 'vitest';
import {
	agruparPorSecao,
	arquivoBibliotecaSimulacao,
	ALTURAS_HTML,
	ehAlturaHtml,
	BIBLIOTECAS_SIMULACAO,
	corretasDoExercicio,
	ehAlturaSimulacao,
	ehBibliotecaSimulacao,
	ehBloco,
	ehNivelTitulo,
	EXEMPLOS_HTML,
	exemploBibliotecaSimulacao,
	hrefLinkInterno,
	linksPara,
	LIMITE_NOME_SECAO,
	mesmoNomeSecao,
	normalizarBlocos,
	normalizarNomeSecao,
	criarBloco,
	NIVEIS_TITULO,
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
		expect(normalizarNomeSecao('a'.repeat(LIMITE_NOME_SECAO + 20))).toHaveLength(LIMITE_NOME_SECAO);
		expect(normalizarNomeSecao('a'.repeat(LIMITE_NOME_SECAO))).toHaveLength(LIMITE_NOME_SECAO);
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

	it('aceita os 6 níveis de título e descarta os que não são heading', () => {
		for (const nivel of NIVEIS_TITULO) {
			expect(ehBloco({ id: 't', tipo: 'titulo', texto: 'Título', nivel: nivel.valor })).toBe(
				true
			);
		}
		expect(ehBloco({ id: 't', tipo: 'titulo', texto: 'Título', nivel: 0 })).toBe(false);
		expect(ehBloco({ id: 't', tipo: 'titulo', texto: 'Título', nivel: 7 })).toBe(false);
		expect(ehBloco({ id: 't', tipo: 'titulo', texto: 'Título', nivel: 2.5 })).toBe(false);
		expect(ehNivelTitulo(4)).toBe(true);
		expect(ehNivelTitulo(7)).toBe(false);
	});

	it('cria o título já em H1', () => {
		expect(criarBloco('titulo')).toMatchObject({ tipo: 'titulo', nivel: 1 });
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
		expect(bloco).toEqual({
			id: 'l',
			tipo: 'link',
			rotulo: 'Aula 1',
			tipoLink: 'aula',
			alvoId: 3,
			tamanho: 'medio',
			largura: 'conteudo',
			posicao: 'esquerda'
		});
	});

	it('descarta o alvoApostilaId: anexo é solto e aula vive na apostila do bloco', () => {
		const [bloco] = normalizarBlocos([
			{ id: 'l', tipo: 'link', rotulo: 'Anexo', tipoLink: 'anexo', alvoId: 9, alvoApostilaId: 4 }
		]);
		expect(bloco).toEqual({
			id: 'l',
			tipo: 'link',
			rotulo: 'Anexo',
			tipoLink: 'anexo',
			alvoId: 9,
			tamanho: 'medio',
			largura: 'conteudo',
			posicao: 'esquerda'
		});
	});

	it('saneia tamanho, largura e posição fora da lista para o padrão', () => {
		const [bloco] = normalizarBlocos([
			{
				id: 'l',
				tipo: 'link',
				rotulo: 'Anexo',
				tipoLink: 'anexo',
				alvoId: 1,
				tamanho: 'gigante',
				largura: 'metade',
				posicao: 'baixo'
			}
		]);
		expect(bloco.tipo === 'link' && bloco.tamanho).toBe('medio');
		expect(bloco.tipo === 'link' && bloco.largura).toBe('conteudo');
		expect(bloco.tipo === 'link' && bloco.posicao).toBe('esquerda');
	});

	it('preserva tamanho, largura e posição válidos', () => {
		const [bloco] = normalizarBlocos([
			{
				id: 'l',
				tipo: 'link',
				rotulo: 'Anexo',
				tipoLink: 'anexo',
				alvoId: 1,
				tamanho: 'grande',
				largura: 'full',
				posicao: 'direita'
			}
		]);
		expect(bloco.tipo === 'link' && bloco.tamanho).toBe('grande');
		expect(bloco.tipo === 'link' && bloco.largura).toBe('full');
		expect(bloco.tipo === 'link' && bloco.posicao).toBe('direita');
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
		expect(limpos[1]).toMatchObject({ tipo: 'formula', latex: 'x^2', destaque: false });
		expect(limpos[2]).toMatchObject({ tipo: 'exercicio', correta: 1, selecao: 'radio' });
		expect((limpos[2] as { explicacao?: string }).explicacao).toBeUndefined();
		expect(limpos[3]).toEqual({ id: 'd', tipo: 'dissertativa', pergunta: 'explique' });
	});

	it('grava a tabela no formato canônico, venha ela do formato antigo ou não', () => {
		const esperado = {
			id: 't',
			tipo: 'tabela',
			linhas: [
				['a', 'b'],
				['1', '2']
			],
			linhasCabecalho: 1,
			colunasCabecalho: 0
		};
		// `cabecalho` é o formato de todo conteúdo já salvo (e o que a IA gera): a
		// partir daqui ele é dobrado na primeira linha da matriz, com a contagem de
		// linhas de cabeçalho guardada em campo próprio.
		const [antigo] = normalizarBlocos([
			{ id: 't', tipo: 'tabela', cabecalho: ['a', 'b'], linhas: [['1', '2']] }
		]);
		expect(antigo).toEqual(esperado);

		const [atual] = normalizarBlocos([
			{ id: 't', tipo: 'tabela', linhas: esperado.linhas, linhasCabecalho: 1 }
		]);
		expect(atual).toEqual(esperado);
	});

	it('aceita a célula avançada da tabela (mescla, th avulso, alinhamento)', () => {
		const [bloco] = normalizarBlocos([
			{
				id: 't',
				tipo: 'tabela',
				linhas: [
					['a', 'b'],
					[{ texto: 'mesclada', colspan: 2, th: true, alinhamento: 'centro' }]
				],
				linhasCabecalho: 1,
				colunasCabecalho: 0,
				legenda: 'Tabela 1',
				zebrada: true
			}
		]);
		expect(bloco).toMatchObject({ legenda: 'Tabela 1', zebrada: true });
		expect((bloco as { linhas: unknown[] }).linhas[1]).toEqual([
			{ texto: 'mesclada', colspan: 2, th: true, alinhamento: 'centro' }
		]);
	});

	it('aceita número e booleano na célula (JSON de IA) e descarta tabela com buraco', () => {
		const [bloco] = normalizarBlocos([
			{ id: 't', tipo: 'tabela', linhas: [['Ano', 2026], ['Ativo', true]] }
		]);
		expect((bloco as { linhas: unknown[] }).linhas).toEqual([
			['Ano', '2026'],
			['Ativo', 'true']
		]);

		expect(normalizarBlocos([{ id: 't', tipo: 'tabela', linhas: [['a', { colspan: 2 }]] }])).toEqual([]);
		expect(normalizarBlocos([{ id: 't', tipo: 'tabela', linhas: [['a', ['b']]] }])).toEqual([]);
	});

	it('tabela sem nenhuma linha vira tabela vazia (o aviso é da pendência)', () => {
		const [bloco] = normalizarBlocos([{ id: 't', tipo: 'tabela' }]);
		expect(bloco).toEqual({
			id: 't',
			tipo: 'tabela',
			linhas: [['']],
			linhasCabecalho: 0,
			colunasCabecalho: 0
		});
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

	it('normaliza a quebra de linha do texto sem podar a indentação', () => {
		// O markdown usa a indentação como sintaxe (código cercado, lista
		// aninhada), então normalizar aqui é só o `\r`, nunca `trim`.
		const [crlf] = normalizarBlocos([
			{ id: 't', tipo: 'texto', conteudo: '  - item\r\n    - sub\r\n\r\n```\r\n  const a = 1;\r\n```' }
		]);
		expect(crlf).toMatchObject({ tipo: 'texto' });
		expect((crlf as { conteudo: string }).conteudo).toBe(
			'  - item\n    - sub\n\n```\n  const a = 1;\n```'
		);

		const [cr] = normalizarBlocos([{ id: 't', tipo: 'texto', conteudo: 'um\rtwo' }]);
		expect((cr as { conteudo: string }).conteudo).toBe('um\ntwo');
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
		// Bloco sem os campos cosméticos (formato antigo) continua válido na leitura.
		const legado = { id: 'l', tipo: 'link', rotulo: 'E', tipoLink: 'anexo' };
		expect(hrefLinkInterno(legado as never, 1)).toBeNull();
		expect(normalizarBlocos([legado])).toEqual([]);
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

describe('bloco de simulação', () => {
	it('nasce em p5, com exemplo pronto e altura padrão', () => {
		const bloco = criarBloco('simulacao');
		expect(bloco.tipo).toBe('simulacao');
		expect(bloco).toMatchObject({ biblioteca: 'p5', altura: 240 });
		expect(bloco).toHaveProperty('codigo', exemploBibliotecaSimulacao('p5'));
		// O exemplo precisa ser código de verdade, não placeholder.
		expect(bloco).toHaveProperty('codigo', expect.stringContaining('function setup()'));
	});

	it('cada biblioteca resolve arquivo e exemplo próprios', () => {
		expect(BIBLIOTECAS_SIMULACAO.map((item) => item.arquivo)).toEqual([
			'p5.min.js',
			'q5.js'
		]);
		for (const item of BIBLIOTECAS_SIMULACAO) {
			expect(arquivoBibliotecaSimulacao(item.valor)).toBe(item.arquivo);
			expect(exemploBibliotecaSimulacao(item.valor)).toBe(item.exemplo);
			expect(item.exemplo).toContain('function draw()');
		}
	});

	it('aceita o bloco do POST e normaliza biblioteca e altura fora da faixa', () => {
		const base = { id: 's', tipo: 'simulacao', codigo: 'function draw() {}', altura: 300 };
		expect(ehBloco(base)).toBe(true);
		expect(normalizarBlocos([base])).toHaveLength(1);

		// Biblioteca desconhecida cai no default e altura fora da faixa no default:
		// o código do professor vale mais que o cosmético.
		const sujo = [{ ...base, biblioteca: 'processing', altura: 4000 }];
		const limpo = normalizarBlocos(sujo)[0];
		expect(limpo).toMatchObject({ biblioteca: 'p5', altura: 240, codigo: base.codigo });

		// Bloco antigo, sem os campos, também volta ao default.
		const legado = normalizarBlocos([{ id: 's', tipo: 'simulacao', codigo: 'x' }])[0];
		expect(legado).toMatchObject({ biblioteca: 'p5', altura: 240 });
	});

	it('descarta simulação sem código', () => {
		expect(ehBloco({ id: 's', tipo: 'simulacao', biblioteca: 'p5', altura: 240 })).toBe(false);
		expect(normalizarBlocos([{ id: 's', tipo: 'simulacao', altura: 240 }])).toHaveLength(0);
	});

	it('valida biblioteca e altura', () => {
		expect(ehBibliotecaSimulacao('p5')).toBe(true);
		expect(ehBibliotecaSimulacao('q5')).toBe(true);
		expect(ehBibliotecaSimulacao('processing')).toBe(false);
		expect(ehAlturaSimulacao(240)).toBe(true);
		expect(ehAlturaSimulacao(0)).toBe(false);
		expect(ehAlturaSimulacao(4000)).toBe(false);
		expect(ehAlturaSimulacao('240')).toBe(false);
	});
});

describe('bloco HTML', () => {
	it('nasce com exemplo nos três painéis e altura padrão', () => {
		const bloco = criarBloco('html');
		expect(bloco.tipo).toBe('html');
		if (bloco.tipo !== 'html') throw new Error('esperava html');
		expect(bloco).toMatchObject({
			altura: 300,
			html: EXEMPLOS_HTML.html,
			css: EXEMPLOS_HTML.css,
			js: EXEMPLOS_HTML.js
		});
		// O exemplo precisa ser código de verdade, não placeholder: os três painéis
		// conversam no bloco novo.
		expect(bloco.html).toContain('<button');
		expect(bloco.js).toContain("getElementById('botao')");
	});

	it('aceita o bloco do POST e normaliza altura fora da faixa', () => {
		const base = { id: 'h', tipo: 'html', html: '<p>x</p>', css: '', js: '', altura: 280 };
		expect(ehBloco(base)).toBe(true);
		expect(normalizarBlocos([base])).toHaveLength(1);
		expect(normalizarBlocos([{ ...base, altura: 4000 }])[0]).toMatchObject({ altura: 300 });
		// Bloco antigo, sem o campo, também volta ao padrão.
		const legado = normalizarBlocos([{ id: 'h', tipo: 'html', html: 'x', css: 'y', js: 'z' }])[0];
		expect(legado).toMatchObject({ altura: 300 });
	});

	it('descarta bloco sem os três painéis (são o conteúdo, não cosmética)', () => {
		expect(ehBloco({ id: 'h', tipo: 'html', html: '<p>x</p>', css: '', js: '' })).toBe(true);
		expect(ehBloco({ id: 'h', tipo: 'html', html: '<p>x</p>', css: '' })).toBe(false);
		expect(normalizarBlocos([{ id: 'h', tipo: 'html', html: '<p>x</p>' }])).toHaveLength(0);
	});

	it('valida a altura', () => {
		expect(ehAlturaHtml(300)).toBe(true);
		expect(ehAlturaHtml(0)).toBe(false);
		expect(ehAlturaHtml(4000)).toBe(false);
		expect(ehAlturaHtml('300')).toBe(false);
		expect(ALTURAS_HTML.minima).toBe(120);
		expect(ALTURAS_HTML.maxima).toBe(900);
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