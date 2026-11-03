// Conversão de blocos guardados para o formato de exportação (round-trip):
// link interno sai como `alvoTitulo` e tabela simples sai no formato curto.
// Vive em módulo client-safe porque o editor de aula exporta o conteúdo atual
// sem ida ao servidor; a exportação server-side (`$lib/server/importar.ts`)
// usa o mesmo caminho.

import {
	ehLarguraLink,
	ehPosicaoLink,
	ehTamanhoLink,
	LARGURA_LINK_PADRAO,
	POSICAO_LINK_PADRAO,
	TAMANHO_LINK_PADRAO,
	type BlocoTabela,
	type Blocos
} from '$lib/blocks';
import type { ImportacaoBloco } from '$lib/importar';
import { montarTabela } from '$lib/tabela';

export type TitulosPorTipo = {
	aulas: Map<number, string>;
	anexos: Map<number, string>;
	exercicios: Map<number, string>;
};

/**
 * Exporta a tabela no **formato curto** (`cabecalho` + `linhas`) quando ela é
 * simples — é o formato da doc da IA e o que o professor lê melhor, então o
 * round-trip export → colar na IA continua enxuto —, e no canônico quando tem
 * mescla, legenda, zebra, `th` avulso, alinhamento, coluna de cabeçalho ou mais
 * de uma linha de cabeçalho (o curto não carrega nada disso). Os dois formatos
 * voltam pelo mesmo caminho na importação (`lerTabela`).
 */
export function tabelaParaExportar(bloco: BlocoTabela): ImportacaoBloco {
	const tabela = montarTabela(bloco);
	const complexa =
		bloco.legenda !== undefined ||
		bloco.zebrada === true ||
		tabela.colunasCabecalho > 0 ||
		tabela.linhasCabecalho > 1 ||
		tabela.linhas.some((linha) =>
			linha.celulas.some(
				(celula) =>
					celula.colspan > 1 ||
					celula.rowspan > 1 ||
					celula.alinhamento !== null ||
					(celula.th && celula.linha !== 0)
			)
		);
	if (complexa) return { ...bloco } as unknown as ImportacaoBloco;

	const texto = tabela.linhas.map((linha) => linha.celulas.map((celula) => celula.texto));
	if (tabela.linhasCabecalho === 1) {
		return { id: bloco.id, tipo: 'tabela', cabecalho: texto[0] ?? [], linhas: texto.slice(1) };
	}
	// Sem cabeçalho o formato curto é só `linhas`: o leitor sem `cabecalho` cai em
	// zero linha de cabeçalho.
	return { id: bloco.id, tipo: 'tabela', linhas: texto };
}

export function blocosParaExportar(blocos: Blocos, titulos: TitulosPorTipo): ImportacaoBloco[] {
	return blocos.map((bloco) => {
		if (bloco.tipo === 'tabela') return tabelaParaExportar(bloco);
		if (bloco.tipo !== 'link' || bloco.tipoLink === 'externo') {
			return { ...bloco } as unknown as ImportacaoBloco;
		}
		const mapa =
			bloco.tipoLink === 'aula'
				? titulos.aulas
				: bloco.tipoLink === 'anexo'
					? titulos.anexos
					: titulos.exercicios;
		const alvoTitulo = bloco.alvoId !== undefined ? mapa.get(bloco.alvoId) : undefined;
		const saida: ImportacaoBloco = {
			id: bloco.id,
			tipo: 'link',
			rotulo: bloco.rotulo,
			tipoLink: bloco.tipoLink
		};
		if (alvoTitulo) saida.alvoTitulo = alvoTitulo;
		// Cosméticos do link: só saem quando fogem do padrão (o JSON curto
		// continua curto) e nunca como `undefined`, já que este caminho lê o JSON
		// cru do banco e um bloco antigo pode não ter os campos.
		if (ehTamanhoLink(bloco.tamanho) && bloco.tamanho !== TAMANHO_LINK_PADRAO) {
			saida.tamanho = bloco.tamanho;
		}
		if (ehLarguraLink(bloco.largura) && bloco.largura !== LARGURA_LINK_PADRAO) {
			saida.largura = bloco.largura;
		}
		if (ehPosicaoLink(bloco.posicao) && bloco.posicao !== POSICAO_LINK_PADRAO) {
			saida.posicao = bloco.posicao;
		}
		return saida;
	});
}
