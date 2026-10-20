import { describe, it, expect } from 'vitest';
import {
	alinhamentoComum,
	areaValida,
	celulaEm,
	celulasNaArea,
	colunasDaTabela,
	definirAlinhamento,
	definirColunasCabecalho,
	definirLegenda,
	definirLinhasCabecalho,
	definirTexto,
	definirTh,
	definirZebrada,
	inserirColuna,
	inserirLinha,
	lerTabela,
	LIMITE_COLUNAS,
	mesclar,
	montarTabela,
	removerColuna,
	removerLinha,
	separar,
	tabelaVazia,
	textoDaCelula,
	type DadosTabela
} from './tabela';

function dados(parcial: Partial<DadosTabela> & Pick<DadosTabela, 'linhas'>): DadosTabela {
	return { linhasCabecalho: 0, colunasCabecalho: 0, ...parcial };
}

/** Texto de cada linha, na ordem da grade (para comparar depois de uma mutação). */
function textoPorLinha(entrada: DadosTabela): string[][] {
	return montarTabela(entrada).linhas.map((linha) => linha.celulas.map((celula) => celula.texto));
}

describe('lerTabela', () => {
	it('lê o formato canônico', () => {
		expect(
			lerTabela({ linhas: [['a', 'b'], ['1', '2']], linhasCabecalho: 1, colunasCabecalho: 1 })
		).toEqual({ linhas: [['a', 'b'], ['1', '2']], linhasCabecalho: 1, colunasCabecalho: 1 });
	});

	it('dobra o formato antigo (cabecalho + linhas) na primeira linha', () => {
		// É o formato de todo conteúdo já salvo e o que a IA gera: entra sem
		// migração de dados, sai como formato canônico.
		expect(lerTabela({ cabecalho: ['a', 'b'], linhas: [['1', '2']] })).toEqual({
			linhas: [['a', 'b'], ['1', '2']],
			linhasCabecalho: 1,
			colunasCabecalho: 0
		});
	});

	it('honra as contagens quando o JSON traz as duas coisas', () => {
		expect(lerTabela({ cabecalho: ['a'], linhas: [['1']], linhasCabecalho: 0 })).toMatchObject({
			linhasCabecalho: 0
		});
	});

	it('aceita número e booleano na célula (JSON de IA)', () => {
		expect(lerTabela({ linhas: [['Ano', 2026], ['Turma', true]] })?.linhas).toEqual([
			['Ano', '2026'],
			['Turma', 'true']
		]);
	});

	it('lê a célula avançada e descarta valor inválido de span/alinhamento', () => {
		const lido = lerTabela({
			linhas: [
				[{ texto: 'mesclada', colspan: 2, rowspan: 1, th: true, alinhamento: 'centro' }],
				[{ texto: 'x', colspan: 0, rowspan: -3, th: 'sim', alinhamento: 'diagonal' }]
			]
		});
		// `colspan: 1`/`rowspan: 1`, `th` que não é `true` e alinhamento fora da
		// lista não entram no JSON: viram célula simples.
		expect(lido).toEqual({
			linhas: [
				[{ texto: 'mesclada', colspan: 2, th: true, alinhamento: 'centro' }],
				['x']
			],
			linhasCabecalho: 0,
			colunasCabecalho: 0
		});
	});

	it('corta as contagens na tabela (o editor não pode apontar para fora)', () => {
		const lido = lerTabela({ linhas: [['a']], linhasCabecalho: 9, colunasCabecalho: 9 });
		expect(lido).toMatchObject({ linhasCabecalho: 1, colunasCabecalho: 9 });
		expect(lerTabela({ linhas: [['a']], colunasCabecalho: LIMITE_COLUNAS + 10 })?.colunasCabecalho).toBe(
			LIMITE_COLUNAS
		);
	});

	it('legenda vazia e zebra desligada não ficam no JSON', () => {
		expect(lerTabela({ linhas: [['a']], legenda: '   ', zebrada: false })).toEqual({
			linhas: [['a']],
			linhasCabecalho: 0,
			colunasCabecalho: 0
		});
		expect(lerTabela({ linhas: [['a']], legenda: 'Tabela 1', zebrada: true })).toMatchObject({
			legenda: 'Tabela 1',
			zebrada: true
		});
	});

	it('tabela sem linha nenhuma vira uma linha em branco (é a pendência que avisa)', () => {
		const lido = lerTabela({});
		expect(lido).toEqual({ linhas: [['']], linhasCabecalho: 0, colunasCabecalho: 0 });
		expect(tabelaVazia(lido!)).toBe(true);
	});

	it('devolve null para o que não é tabela', () => {
		expect(lerTabela(null)).toBeNull();
		expect(lerTabela('tabela')).toBeNull();
		expect(lerTabela([])).toBeNull();
		expect(lerTabela({ cabecalho: 'a', linhas: [] })).toBeNull();
		expect(lerTabela({ linhas: [['1'], 'não-linha'] })).toBeNull();
		expect(lerTabela({ linhas: [['1'], [['aninhado']]] })).toBeNull();
	});
});

describe('montarTabela', () => {
	it('marca `th` pela linha, pela coluna e pelo `th` avulso', () => {
		const tabela = montarTabela(
			dados({
				linhas: [['a', 'b'], [{ texto: 'rótulo', th: true }, '1']],
				linhasCabecalho: 1,
				colunasCabecalho: 0
			})
		);
		expect(tabela.colunas).toBe(2);
		expect(tabela.linhas[0].celulas.every((celula) => celula.th)).toBe(true);
		expect(tabela.linhas[1].celulas.map((celula) => celula.th)).toEqual([true, false]);
	});

	it('coluna de cabeçalho marca a coluna da esquerda', () => {
		const tabela = montarTabela(
			dados({ linhas: [['a', 'b'], ['1', '2']], colunasCabecalho: 1 })
		);
		expect(tabela.linhas[0].celulas.map((celula) => celula.th)).toEqual([true, false]);
		expect(tabela.linhas[1].celulas.map((celula) => celula.th)).toEqual([true, false]);
	});

	it('o `colspan` empurra as células seguintes e conta as colunas', () => {
		const tabela = montarTabela(dados({ linhas: [[{ texto: 'cheia', colspan: 3 }, 'fim']] }));
		expect(tabela.colunas).toBe(4);
		expect(tabela.linhas[0].celulas.map((celula) => celula.coluna)).toEqual([0, 3]);
	});

	it('o `rowspan` reserva a coluna na linha de baixo', () => {
		const tabela = montarTabela(
			dados({ linhas: [[{ texto: 'lado', rowspan: 2 }, 'b'], ['c', 'd']] })
		);
		// Mesmo que o HTML: a coluna 0 está tomada, então `c` e `d` entram em 1 e 2.
		expect(tabela.colunas).toBe(3);
		expect(tabela.linhas[1].celulas.map((celula) => celula.coluna)).toEqual([1, 2]);
	});

	it('span maior que a tabela é cortado no limite de colunas da grade', () => {
		const tabela = montarTabela(dados({ linhas: [['a'], [{ texto: 'larga', colspan: 99 }]] }));
		expect(tabela.linhas[1].celulas[0].colspan).toBe(LIMITE_COLUNAS);
		expect(tabela.colunas).toBe(LIMITE_COLUNAS);

		const vertical = montarTabela(dados({ linhas: [[{ texto: 'alta', rowspan: 99 }]] }));
		expect(vertical.linhas[0].celulas[0].rowspan).toBe(1);
	});
});

describe('seleção por coordenada de grade', () => {
	const tabela = montarTabela(
		dados({ linhas: [['a', 'b'], [{ texto: 'x', rowspan: 2 }, 'c'], ['d']] })
	);

	it('celulaEm acha pela posição da grade (não pelo índice do array)', () => {
		expect(celulaEm(tabela, { linha: 1, coluna: 0 })?.texto).toBe('x');
		expect(celulaEm(tabela, { linha: 2, coluna: 0 })).toBeNull();
		expect(celulaEm(tabela, { linha: 2, coluna: 1 })?.texto).toBe('d');
	});

	it('celulasNaArea devolve as que começam dentro, em ordem de leitura', () => {
		expect(
			celulasNaArea(tabela, { linha0: 0, coluna0: 1, linha1: 2, coluna1: 1 }).map(
				(celula) => celula.texto
			)
		).toEqual(['b', 'c', 'd']);
	});

	it('areaValida recusa retângulo que corta célula mesclada', () => {
		expect(areaValida(tabela, { linha0: 0, coluna0: 0, linha1: 1, coluna1: 1 })).toBe(false);
		expect(areaValida(tabela, { linha0: 1, coluna0: 0, linha1: 2, coluna1: 0 })).toBe(true);
		expect(areaValida(tabela, { linha0: 1, coluna0: 0, linha1: 1, coluna1: 1 })).toBe(false);
	});
});

describe('mutações da tabela', () => {
	it('definirTexto usa a coordenada da grade', () => {
		const base = dados({ linhas: [[{ texto: 'mesclada', colspan: 2 }, 'aqui']] });
		const depois = definirTexto(base, { linha: 0, coluna: 2 }, 'novo');
		expect(textoPorLinha(depois)).toEqual([['mesclada', 'novo']]);
	});

	it('definirTexto em posição sem célula não muda nada', () => {
		const base = dados({ linhas: [['a']] });
		expect(definirTexto(base, { linha: 5, coluna: 5 }, 'x')).toBe(base);
	});

	it('mesclar junta o texto de todas as células da área', () => {
		const base = dados({ linhas: [['a', 'b'], ['c', 'd']] });
		const depois = mesclar(base, { linha0: 0, coluna0: 0, linha1: 1, coluna1: 1 });
		// A área cobria a tabela inteira: sobra uma célula e a segunda linha sai
		// (sem célula ela não teria o que selecionar no editor e não muda o desenho).
		expect(depois?.linhas).toEqual([[{ texto: 'a b c d', colspan: 2 }]]);
		expect(textoPorLinha(depois!)).toEqual([['a b c d']]);
	});

	it('mesclar só vale para retângulo inteiro e com mais de uma célula', () => {
		const base = dados({ linhas: [[{ texto: 'larga', colspan: 2 }, 'a'], ['b', 'c']] });
		expect(mesclar(base, { linha0: 0, coluna0: 1, linha1: 1, coluna1: 1 })).toBeNull();
		expect(mesclar(base, { linha0: 1, coluna0: 0, linha1: 1, coluna1: 0 })).toBeNull();
	});

	it('mesclar preserva `th` quando todas as células da área são de cabeçalho', () => {
		const base = dados({ linhas: [['a', 'b']], linhasCabecalho: 1 });
		const depois = mesclar(base, { linha0: 0, coluna0: 0, linha1: 0, coluna1: 1 });
		expect(depois?.linhas).toEqual([[{ texto: 'a b', colspan: 2, th: true }]]);
	});

	it('separar devolve as células com o texto na primeira e o resto vazio', () => {
		const base = dados({
			linhas: [
				[{ texto: 'cheia', colspan: 2, rowspan: 2 }, 'b'],
				['c']
			]
		});
		expect(textoPorLinha(base)).toEqual([['cheia', 'b'], ['c']]);
		const depois = separar(base, { linha0: 0, coluna0: 0, linha1: 1, coluna1: 1 });
		expect(textoPorLinha(depois)).toEqual([
			['cheia', '', 'b'],
			['', '', 'c']
		]);
		expect(
			montarTabela(depois).linhas.every((linha) =>
				linha.celulas.every((celula) => celula.colspan === 1 && celula.rowspan === 1)
			)
		).toBe(true);
	});

	it('separar sem mescla na área não muda nada', () => {
		const base = dados({ linhas: [['a', 'b']] });
		expect(separar(base, { linha0: 0, coluna0: 0, linha1: 0, coluna1: 1 })).toBe(base);
	});

	it('definirTh e definirAlinhamento valem para a área toda', () => {
		const base = dados({ linhas: [['a', 'b'], ['c', 'd']] });
		const comTh = definirTh(base, { linha0: 0, coluna0: 0, linha1: 0, coluna1: 1 }, true);
		expect(montarTabela(comTh).linhas[0].celulas.every((celula) => celula.th)).toBe(true);

		const area = { linha0: 1, coluna0: 0, linha1: 1, coluna1: 1 };
		const alinhado = definirAlinhamento(comTh, area, 'centro');
		const tabela = montarTabela(alinhado);
		expect(alinhado.linhas[1]).toEqual([
			{ texto: 'c', alinhamento: 'centro' },
			{ texto: 'd', alinhamento: 'centro' }
		]);
		expect(alinhamentoComum(tabela.linhas[1].celulas)).toBe('centro');
		expect(alinhamentoComum(tabela.linhas[0].celulas)).toBeNull();

		const limpo = definirAlinhamento(alinhado, area, null);
		expect(limpo.linhas[1]).toEqual(['c', 'd']);
	});

	it('inserir linha e coluna aumentam a grade', () => {
		const base = dados({ linhas: [['a'], ['b']], linhasCabecalho: 1 });
		const comColuna = inserirColuna(base);
		expect(comColuna.linhas).toEqual([['a', ''], ['b', '']]);
		const comLinha = inserirLinha(comColuna);
		expect(comLinha.linhas).toEqual([['a', ''], ['b', ''], ['', '']]);
		expect(montarTabela(comLinha).colunas).toBe(2);
		expect(comLinha.linhasCabecalho).toBe(1);
	});

	it('remover linha encolhe o `rowspan` que a atravessava', () => {
		const base = dados({ linhas: [[{ texto: 'alta', rowspan: 3 }, 'a'], ['b'], ['c']] });
		const depois = removerLinha(base, 1);
		expect(montarTabela(depois).linhas[0].celulas[0].rowspan).toBe(2);
		expect(textoPorLinha(depois)).toEqual([['alta', 'a'], ['c']]);
	});

	it('remover linha não deixa a tabela vazia nem sai da faixa', () => {
		const base = dados({ linhas: [['a'], ['b']] });
		expect(removerLinha(base, 5)).toBe(base);
		expect(removerLinha(dados({ linhas: [['a']] }), 0)).toEqual(dados({ linhas: [['a']] }));
	});

	it('remover coluna tira a célula que começa nela e encolhe a que a cobre', () => {
		const base = dados({ linhas: [[{ texto: 'larga', colspan: 3 }, 'a'], ['b', 'c', 'd']] });
		// Coluna 1: `larga` perde uma coluna, `a` continua no fim.
		const depois = removerColuna(base, 1);
		expect(depois.linhas).toEqual([[{ texto: 'larga', colspan: 2 }, 'a'], ['b', 'd']]);
		expect(montarTabela(depois).colunas).toBe(3);
	});

	it('remover coluna respeita o limite e a faixa', () => {
		const base = dados({ linhas: [['a', 'b']] });
		expect(removerColuna(base, 9)).toBe(base);
		expect(removerColuna(dados({ linhas: [['a']] }), 0)).toEqual(dados({ linhas: [['a']] }));
	});

	it('as contagens de cabeçalho são cortadas na tabela', () => {
		const base = dados({ linhas: [['a'], ['b']] });
		expect(definirLinhasCabecalho(base, 9).linhasCabecalho).toBe(2);
		expect(definirLinhasCabecalho(base, -1).linhasCabecalho).toBe(0);
		expect(definirColunasCabecalho(base, 99).colunasCabecalho).toBe(LIMITE_COLUNAS);
	});

	it('legenda e zebra ficam como o professor digitou até o salvamento normalizar', () => {
		const base = dados({ linhas: [['a']] });
		const comLegenda = definirLegenda(base, '   ');
		expect(comLegenda.legenda).toBe('   ');
		expect(lerTabela(comLegenda)?.legenda).toBeUndefined();

		expect(definirZebrada(base, true).zebrada).toBe(true);
		expect(lerTabela(definirZebrada(base, false))?.zebrada).toBeUndefined();
	});

	it('textoDaCelula lê os dois formatos de célula', () => {
		expect(textoDaCelula('a')).toBe('a');
		expect(textoDaCelula({ texto: 'b', colspan: 2 })).toBe('b');
	});
});
