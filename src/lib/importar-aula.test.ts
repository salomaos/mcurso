import { describe, it, expect } from 'vitest';
import { criarBloco, type BlocoLink, type Blocos } from './blocks';
import { interpretarImportacaoAula } from './importar';
import { exportarAulaLocal, resolverLinksAula, type AlvosLinksAula } from './importar-aula';

const ALVOS: AlvosLinksAula = {
	aulas: [
		{ id: 1, titulo: 'Função afim' },
		{ id: 2, titulo: 'Gráfico da função afim' }
	],
	anexos: [{ id: 10, titulo: 'Manual de fórmulas' }],
	exercicios: [{ id: 20, titulo: 'Prova 1' }]
};

function linkAula(parcial: Record<string, unknown>): Record<string, unknown> {
	return { tipo: 'link', rotulo: 'Ver', tipoLink: 'aula', ...parcial };
}

describe('resolverLinksAula', () => {
	it('gera id para bloco sem id, preserva o válido e regenera o repetido', () => {
		const resultado = resolverLinksAula(
			[
				{ tipo: 'texto', conteudo: 'a' },
				{ id: 'fixo', tipo: 'texto', conteudo: 'b' },
				{ id: 'fixo', tipo: 'texto', conteudo: 'c' }
			],
			ALVOS
		);
		if ('erro' in resultado) throw new Error(resultado.erro);
		const [gerado, mantido, repetido] = resultado.blocos;
		expect(gerado.id).toBeTruthy();
		expect(mantido.id).toBe('fixo');
		expect(repetido.id).toBeTruthy();
		expect(repetido.id).not.toBe('fixo');
	});

	it('mantém link externo com url e cosméticos', () => {
		const resultado = resolverLinksAula(
			[
				{
					id: 'l1',
					tipo: 'link',
					rotulo: 'Site',
					tipoLink: 'externo',
					url: 'https://geoGebra.org',
					tamanho: 'grande'
				}
			],
			ALVOS
		);
		if ('erro' in resultado) throw new Error('esperava blocos');
		expect(resultado.blocos[0]).toMatchObject({
			tipo: 'link',
			rotulo: 'Site',
			tipoLink: 'externo',
			url: 'https://geoGebra.org',
			tamanho: 'grande'
		});
	});

	it('resolve link de aula por alvoTitulo (sem acento/caixa) e por alvoId', () => {
		const porTitulo = resolverLinksAula([linkAula({ alvoTitulo: 'funcao afim' })], ALVOS);
		if ('erro' in porTitulo) throw new Error(porTitulo.erro);
		expect(porTitulo.blocos[0]).toMatchObject({ tipo: 'link', alvoId: 1 });

		const porId = resolverLinksAula([linkAula({ alvoId: 2 })], ALVOS);
		if ('erro' in porId) throw new Error(porId.erro);
		expect(porId.blocos[0]).toMatchObject({ alvoId: 2 });
	});

	it('resolve link de anexo/atividade por título e por id', () => {
		const porTitulo = resolverLinksAula(
			[{ tipo: 'link', rotulo: 'Apoio', tipoLink: 'anexo', alvoTitulo: 'manual de fórmulas' }],
			ALVOS
		);
		if ('erro' in porTitulo) throw new Error(porTitulo.erro);
		expect(porTitulo.blocos[0]).toMatchObject({ tipoLink: 'anexo', alvoId: 10 });

		const porId = resolverLinksAula(
			[{ tipo: 'link', rotulo: 'Prova', tipoLink: 'exercicio', alvoId: 20 }],
			ALVOS
		);
		if ('erro' in porId) throw new Error(porId.erro);
		expect(porId.blocos[0]).toMatchObject({ tipoLink: 'exercicio', alvoId: 20 });
	});

	it('recusa alvoOrdem, alvo inexistente e link sem alvo', () => {
		expect(resolverLinksAula([linkAula({ alvoOrdem: 1 })], ALVOS)).toMatchObject({
			erro: /alvoOrdem/
		});
		expect(resolverLinksAula([linkAula({ alvoTitulo: 'Não existe' })], ALVOS)).toMatchObject({
			erro: /Não achei a aula "Não existe"/
		});
		expect(resolverLinksAula([linkAula({ alvoId: 99 })], ALVOS)).toMatchObject({
			erro: /não existe nesta apostila/
		});
		expect(resolverLinksAula([linkAula({})], ALVOS)).toMatchObject({
			erro: /não diz o alvo/
		});
		expect(
			resolverLinksAula(
				[{ tipo: 'link', rotulo: 'Apoio', tipoLink: 'anexo', alvoTitulo: 'Outro' }],
				ALVOS
			)
		).toMatchObject({ erro: /Não achei um anexo/ });
	});

	it('descarta link com tipoLink desconhecido e normaliza os demais blocos', () => {
		const resultado = resolverLinksAula(
			[
				{ tipo: 'link', rotulo: 'Vídeo', tipoLink: 'video', url: 'https://x.dev' },
				{
					tipo: 'exercicio',
					pergunta: 'Quanto é 2+2?',
					alternativas: ['3', '4'],
					correta: 1
				}
			],
			ALVOS
		);
		if ('erro' in resultado) throw new Error(resultado.erro);
		expect(resultado.blocos).toHaveLength(1);
		expect(resultado.blocos[0]).toMatchObject({ tipo: 'exercicio', selecao: 'radio' });
	});
});

describe('exportarAulaLocal', () => {
	const blocos: Blocos = [
		{ id: 't1', tipo: 'texto', conteudo: 'Conteúdo **negrito**' },
		{
			id: 'l1',
			tipo: 'link',
			rotulo: 'Ver gráfico',
			tipoLink: 'aula',
			tamanho: 'medio',
			largura: 'conteudo',
			posicao: 'esquerda',
			alvoId: 2
		} as BlocoLink,
		criarBloco('tabela')
	];

	it('exporta no envelope canônico, com link interno como alvoTitulo', () => {
		const json = exportarAulaLocal('Aula A', 'Descrição', blocos, ALVOS);

		const parse = interpretarImportacaoAula(json);
		if ('erro' in parse) throw new Error(parse.erro);
		expect(parse.dados).toMatchObject({ conteudo: 'aula', titulo: 'Aula A', descricao: 'Descrição' });

		const link = parse.dados.blocos.find((bloco) => bloco.tipo === 'link');
		expect(link).toMatchObject({ alvoTitulo: 'Gráfico da função afim' });
		expect(link).not.toHaveProperty('alvoId');

		// Tabela simples sai no formato curto (legível para a IA).
		expect(json).not.toContain('"linhasCabecalho"');
		expect(json).toContain('"cabecalho"');
	});

	it('round-trip: exportar e reimportar devolve os mesmos blocos', () => {
		const json = exportarAulaLocal('Aula A', 'Descrição', blocos, ALVOS);
		const parse = interpretarImportacaoAula(json);
		if ('erro' in parse) throw new Error(parse.erro);

		const resolvido = resolverLinksAula(parse.dados.blocos, ALVOS);
		if ('erro' in resolvido) throw new Error(resolvido.erro);
		expect(resolvido.blocos).toEqual(blocos);
	});
});
