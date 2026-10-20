// Modelo do bloco de tabela.
//
// A tabela é **uma matriz só** (`linhas`): o cabeçalho é descrito por contagem —
// `linhasCabecalho` (quantas linhas do topo saem como `<th>` no `<thead>`) e
// `colunasCabecalho` (quantas colunas da esquerda saem como `<th>`, o cabeçalho
// de linha das tabelas de comparação). O `th` avulso na célula cobre o título no
// meio do corpo. Célula é string no caso comum e objeto quando precisa de
// mescla/alinhamento/cabeçalho.
//
// Três decisões que não são óbvias:
//
// - **O formato antigo (`cabecalho` + `linhas`) é lido para sempre**. Ele é o que
//   está no banco, o que a IA gera e o que está em `DOCS/importacao-ia.md`; o
//   `lerTabela` o dobra na primeira linha e ninguém precisa migrar nada (a
//   leitura de aula/anexo/atividade já passa por `normalizarBlocos`).
// - **`montarTabela` é a fonte da verdade do layout**: leitura, editor, impressão
//   e as pendências falam pela grade que ela devolve, nunca pelo índice do array
//   (uma mescla faz o índice cru e a coluna da grade divergirem). O layout é
//   tolerante de propósito — célula que colide com uma mescla escorrega para a
//   próxima coluna livre, span fora da faixa é cortado no limite da tabela —,
//   então JSON torto de IA não quebra a página nem some com o texto.
// - **As operações do editor trabalham em coordenada de grade** (linha/coluna de
//   `montarTabela`), não em índice de array: é o que permite remover a coluna
//   que uma mescla atravessa sem deixar `rowspan` apontando para o vazio.

export const LIMITE_LINHAS = 500;
export const LIMITE_COLUNAS = 60;
const LIMITE_SPAN = 60;

export const ALINHAMENTOS = [
	{ valor: 'esquerda', rotulo: 'Esquerda' },
	{ valor: 'centro', rotulo: 'Centro' },
	{ valor: 'direita', rotulo: 'Direita' }
] as const;

export type Alinhamento = (typeof ALINHAMENTOS)[number]['valor'];

/** Classe da lib por alinhamento (`.text-*` é `!important`, ganha do `.table`). */
export const CLASSE_ALINHAMENTO: Record<Alinhamento, string> = {
	esquerda: 'text-left',
	centro: 'text-center',
	direita: 'text-right'
};

const ALINHAMENTOS_VALIDOS = new Set<string>(ALINHAMENTOS.map((item) => item.valor));

export function ehAlinhamento(valor: unknown): valor is Alinhamento {
	return typeof valor === 'string' && ALINHAMENTOS_VALIDOS.has(valor);
}

export type CelulaAvancada = {
	texto: string;
	/** Colunas ocupadas (>= 2 quando há mescla horizontal). */
	colspan?: number;
	/** Linhas ocupadas (>= 2 quando há mescla vertical). */
	rowspan?: number;
	/** Célula de cabeçalho fora das linhas/colunas de cabeçalho. */
	th?: boolean;
	alinhamento?: Alinhamento;
};

export type CelulaTabela = string | CelulaAvancada;
export type LinhaTabela = CelulaTabela[];

export type DadosTabela = {
	linhas: LinhaTabela[];
	/** Quantas linhas do topo são `<th>`. 0 = tabela sem cabeçalho. */
	linhasCabecalho: number;
	/** Quantas colunas da esquerda são `<th>`. 0 = nenhuma. */
	colunasCabecalho: number;
	legenda?: string;
	/** Linhas listradas (`table-zebra` da lib). */
	zebrada?: boolean;
};

export type CelulaRender = {
	texto: string;
	colspan: number;
	rowspan: number;
	/** Sai como `<th>` (linha de cabeçalho, coluna de cabeçalho ou `th` da célula). */
	th: boolean;
	alinhamento: Alinhamento | null;
	/** Linha da grade onde a célula começa. */
	linha: number;
	/** Coluna da grade onde a célula começa. */
	coluna: number;
	/** Índice da célula no array cru da linha (é o que o editor edita). */
	indice: number;
};

export type LinhaRender = { cabecalho: boolean; celulas: CelulaRender[] };
export type TabelaRender = {
	colunas: number;
	linhas: LinhaRender[];
	/** Já cortado no tamanho da tabela (0..linhas.length). */
	linhasCabecalho: number;
	/** Faixa de colunas de cabeçalho, também já cortada (o editor precisa dela). */
	colunasCabecalho: number;
};

export type Posicao = { linha: number; coluna: number };
export type AreaTabela = { linha0: number; coluna0: number; linha1: number; coluna1: number };

function clampInteiro(valor: unknown, minimo: number, maximo: number): number {
	const numero = typeof valor === 'number' && Number.isFinite(valor) ? Math.trunc(valor) : NaN;
	if (Number.isNaN(numero)) return minimo;
	return Math.min(Math.max(numero, minimo), Math.max(minimo, maximo));
}

export function textoDaCelula(celula: CelulaTabela): string {
	return typeof celula === 'string' ? celula : celula.texto;
}

export function comoAvancada(celula: CelulaTabela): CelulaAvancada {
	return typeof celula === 'string' ? { texto: celula } : celula;
}

/**
 * Guarda a célula no formato mais curto possível: string quando não tem nada
 * além do texto. É o que mantém o JSON salvo e o export da IA enxutos.
 */
export function comoValor(celula: CelulaAvancada): CelulaTabela {
	const span = (celula.colspan ?? 1) > 1 || (celula.rowspan ?? 1) > 1;
	if (!span && celula.th !== true && celula.alinhamento === undefined) return celula.texto;
	const saida: CelulaAvancada = { texto: celula.texto };
	if ((celula.colspan ?? 1) > 1) saida.colspan = celula.colspan;
	if ((celula.rowspan ?? 1) > 1) saida.rowspan = celula.rowspan;
	if (celula.th === true) saida.th = true;
	if (celula.alinhamento !== undefined) saida.alinhamento = celula.alinhamento;
	return saida;
}

// Texto de célula aceita string, número e booleano (JSON de IA costuma trazer
// `[["Ano", 2026], ["Turma", 3]]`); objeto é célula avançada; o resto é lixo.
function lerCelula(valor: unknown): CelulaAvancada | null {
	if (valor === null || valor === undefined) return { texto: '' };
	if (typeof valor === 'string') return { texto: valor };
	if (typeof valor === 'number' || typeof valor === 'boolean') return { texto: String(valor) };
	if (typeof valor !== 'object' || Array.isArray(valor)) return null;
	const bruto = valor as Record<string, unknown>;
	if (typeof bruto.texto !== 'string') return null;
	const celula: CelulaAvancada = { texto: bruto.texto };
	const colspan = clampInteiro(bruto.colspan, 1, LIMITE_SPAN);
	if (colspan > 1) celula.colspan = colspan;
	const rowspan = clampInteiro(bruto.rowspan, 1, LIMITE_SPAN);
	if (rowspan > 1) celula.rowspan = rowspan;
	if (bruto.th === true) celula.th = true;
	if (ehAlinhamento(bruto.alinhamento)) celula.alinhamento = bruto.alinhamento;
	return celula;
}

function lerLinha(valor: unknown): LinhaTabela | null {
	if (!Array.isArray(valor)) return null;
	const linha: LinhaTabela = [];
	for (const item of valor.slice(0, LIMITE_COLUNAS)) {
		const celula = lerCelula(item);
		if (!celula) return null;
		linha.push(comoValor(celula));
	}
	return linha;
}

/**
 * Leitor tolerante: aceita o formato canônico (`linhas` + contagens) e o antigo
 * (`cabecalho` + `linhas`, de todo conteúdo já salvo e do contrato da IA).
 * Devolve `null` quando não dá para ler tabela nenhuma (aí `ehBloco` descarta);
 * tabela sem linha nenhuma vira uma linha em branco — é a pendência "tabela
 * vazia" que avisa, descartar o bloco perderia mais.
 */
export function lerTabela(entrada: unknown): DadosTabela | null {
	if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) return null;
	const bruto = entrada as Record<string, unknown>;

	const linhas: LinhaTabela[] = [];

	// Formato antigo: `cabecalho` é a linha de `<th>` que vinha separada.
	if (bruto.cabecalho !== undefined) {
		if (!Array.isArray(bruto.cabecalho)) return null;
		const cabecalho = lerLinha(bruto.cabecalho);
		if (!cabecalho) return null;
		linhas.push(cabecalho);
	}

	if (bruto.linhas !== undefined) {
		if (!Array.isArray(bruto.linhas)) return null;
		for (const linha of bruto.linhas.slice(0, LIMITE_LINHAS)) {
			const lida = lerLinha(linha);
			if (!lida) return null;
			linhas.push(lida);
		}
	}

	// Sem nenhuma linha a tabela continua existindo (vazia): quem avisa é a
	// pendência "tabela vazia", que é mais útil que descartar o bloco.
	if (linhas.length === 0) linhas.push(['']);

	const linhasCabecalho =
		bruto.cabecalho !== undefined && bruto.linhasCabecalho === undefined
			? 1
			: clampInteiro(bruto.linhasCabecalho, 0, linhas.length);

	const dados: DadosTabela = {
		linhas,
		linhasCabecalho,
		colunasCabecalho: clampInteiro(bruto.colunasCabecalho, 0, LIMITE_COLUNAS)
	};
	if (typeof bruto.legenda === 'string' && bruto.legenda.trim() !== '') dados.legenda = bruto.legenda;
	if (bruto.zebrada === true) dados.zebrada = true;
	return dados;
}

/**
 * Layout da tabela: cada célula com a posição na grade e o span já efetivo. É o
 * único lugar que resolve mescla — quem renderiza (leitura, impressão, editor)
 * pergunta a posição a esta função em vez de andar pelo índice do array.
 */
export function montarTabela(dados: DadosTabela): TabelaRender {
	const total = Math.min(dados.linhas.length, LIMITE_LINHAS);
	const linhasCabecalho = clampInteiro(dados.linhasCabecalho, 0, total);
	const colunasCabecalho = clampInteiro(dados.colunasCabecalho, 0, LIMITE_COLUNAS);

	const ocupadas: boolean[][] = [];
	const estaOcupada = (linha: number, coluna: number) => ocupadas[linha]?.[coluna] === true;
	const marcar = (linha0: number, coluna0: number, linha1: number, coluna1: number) => {
		for (let linha = linha0; linha <= linha1; linha++) {
			const faixa = (ocupadas[linha] ??= []);
			for (let coluna = coluna0; coluna <= coluna1; coluna++) faixa[coluna] = true;
		}
	};

	const linhas: LinhaRender[] = [];
	let colunas = 0;

	for (let linha = 0; linha < total; linha++) {
		const celulas: CelulaRender[] = [];
		let coluna = 0;
		const cruas = dados.linhas[linha];

		for (let indice = 0; indice < cruas.length; indice++) {
			if (coluna >= LIMITE_COLUNAS) break;
			// Coluna tomada por um `rowspan` de cima: a célula escorrega para a
			// próxima livre (layout tolerante, nada se perde).
			while (coluna < LIMITE_COLUNAS && estaOcupada(linha, coluna)) coluna++;
			if (coluna >= LIMITE_COLUNAS) break;

			const avancada = comoAvancada(cruas[indice]);
			const colspan = Math.min(clampInteiro(avancada.colspan, 1, LIMITE_SPAN), LIMITE_COLUNAS - coluna);
			const rowspan = Math.min(clampInteiro(avancada.rowspan, 1, LIMITE_SPAN), total - linha);

			celulas.push({
				texto: avancada.texto,
				colspan,
				rowspan,
				th: avancada.th === true || linha < linhasCabecalho || coluna < colunasCabecalho,
				alinhamento: avancada.alinhamento ?? null,
				linha,
				coluna,
				indice
			});

			marcar(linha, coluna, linha + rowspan - 1, coluna + colspan - 1);
			coluna += colspan;
			if (coluna > colunas) colunas = coluna;
		}

		linhas.push({ cabecalho: linha < linhasCabecalho, celulas });
	}

	return { colunas, linhas, linhasCabecalho, colunasCabecalho };
}

export function colunasDaTabela(dados: DadosTabela): number {
	return montarTabela(dados).colunas;
}

export function tabelaVazia(dados: DadosTabela): boolean {
	return dados.linhas.every((linha) =>
		linha.every((celula) => textoDaCelula(celula).trim() === '')
	);
}

export function normalizarArea(area: AreaTabela): AreaTabela {
	return {
		linha0: Math.min(area.linha0, area.linha1),
		linha1: Math.max(area.linha0, area.linha1),
		coluna0: Math.min(area.coluna0, area.coluna1),
		coluna1: Math.max(area.coluna0, area.coluna1)
	};
}

/** Célula que **começa** na posição (a coberta por mescla não existe na grade). */
export function celulaEm(tabela: TabelaRender, posicao: Posicao): CelulaRender | null {
	return tabela.linhas[posicao.linha]?.celulas.find((celula) => celula.coluna === posicao.coluna) ?? null;
}

/** Células que começam dentro da área, em ordem de leitura. */
export function celulasNaArea(tabela: TabelaRender, area: AreaTabela): CelulaRender[] {
	const alvo = normalizarArea(area);
	const saida: CelulaRender[] = [];
	for (let linha = alvo.linha0; linha <= alvo.linha1; linha++) {
		for (const celula of tabela.linhas[linha]?.celulas ?? []) {
			if (celula.coluna >= alvo.coluna0 && celula.coluna <= alvo.coluna1) saida.push(celula);
		}
	}
	return saida;
}

/**
 * Mescla só vale para retângulo inteiro: nenhuma célula pode ser cortado pela
 * borda da seleção (é a mesma regra do editor de texto — quem quiser mesclar
 * parte de uma célula separa antes).
 */
export function areaValida(tabela: TabelaRender, area: AreaTabela): boolean {
	const alvo = normalizarArea(area);
	for (const linha of tabela.linhas) {
		for (const celula of linha.celulas) {
			const cruzaLinhas = celula.linha <= alvo.linha1 && alvo.linha0 < celula.linha + celula.rowspan;
			const cruzaColunas = celula.coluna <= alvo.coluna1 && alvo.coluna0 < celula.coluna + celula.colspan;
			if (!cruzaLinhas || !cruzaColunas) continue;
			// Toda célula que toca a área tem de estar inteira dentro dela: cortar
			// pela borda não é mescla de retângulo.
			const dentro =
				celula.linha >= alvo.linha0 &&
				celula.coluna >= alvo.coluna0 &&
				celula.linha + celula.rowspan - 1 <= alvo.linha1 &&
				celula.coluna + celula.colspan - 1 <= alvo.coluna1;
			if (!dentro) return false;
		}
	}
	return true;
}

export function alinhamentoComum(celulas: CelulaRender[]): Alinhamento | null {
	if (celulas.length === 0) return null;
	const primeiro = celulas[0].alinhamento;
	return celulas.every((celula) => celula.alinhamento === primeiro) ? primeiro : null;
}

function chave(linha: number, indice: number): string {
	return `${linha}:${indice}`;
}

function comLinhas(dados: DadosTabela, linhas: LinhaTabela[]): DadosTabela {
	const saida: DadosTabela = {
		...dados,
		linhas,
		linhasCabecalho: clampInteiro(dados.linhasCabecalho, 0, linhas.length)
	};
	if (!saida.legenda) delete saida.legenda;
	if (!saida.zebrada) delete saida.zebrada;
	return saida;
}

/**
 * Aplica uma mudança a toda célula que começa dentro da área (th, alinhamento).
 * A linha do array é recriada só quando alguma célula dela muda.
 */
function naArea(
	dados: DadosTabela,
	area: AreaTabela,
	transformar: (celula: CelulaAvancada) => CelulaAvancada
): DadosTabela {
	const tabela = montarTabela(dados);
	const alvos = new Set(celulasNaArea(tabela, area).map((celula) => chave(celula.linha, celula.indice)));
	const linhas = dados.linhas.map((linha, indiceLinha) =>
		linha.map((celula, indice) =>
			alvos.has(chave(indiceLinha, indice)) ? comoValor(transformar(comoAvancada(celula))) : celula
		)
	);
	return comLinhas(dados, linhas);
}

export function definirTexto(dados: DadosTabela, posicao: Posicao, texto: string): DadosTabela {
	const tabela = montarTabela(dados);
	const alvo = celulaEm(tabela, posicao);
	if (!alvo) return dados;
	const linhas = dados.linhas.map((linha, indice) =>
		indice === alvo.linha
			? linha.map((celula, i) => (i === alvo.indice ? comoValor({ ...comoAvancada(celula), texto }) : celula))
			: linha
	);
	return comLinhas(dados, linhas);
}

export function definirTh(dados: DadosTabela, area: AreaTabela, valor: boolean): DadosTabela {
	return naArea(dados, area, (celula) => ({ ...celula, th: valor }));
}

export function definirAlinhamento(
	dados: DadosTabela,
	area: AreaTabela,
	valor: Alinhamento | null
): DadosTabela {
	return naArea(dados, area, (celula) => {
		const copia = { ...celula };
		if (valor === null) delete copia.alinhamento;
		else copia.alinhamento = valor;
		return copia;
	});
}

export function definirLinhasCabecalho(dados: DadosTabela, quantidade: number): DadosTabela {
	return comLinhas({ ...dados, linhasCabecalho: quantidade }, dados.linhas);
}

export function definirColunasCabecalho(dados: DadosTabela, quantidade: number): DadosTabela {
	return { ...dados, colunasCabecalho: clampInteiro(quantidade, 0, LIMITE_COLUNAS) };
}

// Legenda e zebra são cosméticas e ficam **como o professor digitou** enquanto o
// bloco está no editor (limpar o campo não pode apagar o valor no meio da
// digitação); quem normaliza (string vazia = sem legenda, `false` = sem zebra) é
// o `lerTabela`, na hora de salvar.
export function definirLegenda(dados: DadosTabela, legenda: string): DadosTabela {
	return { ...dados, legenda };
}

export function definirZebrada(dados: DadosTabela, zebrada: boolean): DadosTabela {
	return { ...dados, zebrada };
}

export function inserirColuna(dados: DadosTabela): DadosTabela {
	// Uma coluna nova em cada linha: é uma coluna a mais na grade, previsível,
	// mesmo quando a linha termina numa célula com `colspan`.
	const linhas = dados.linhas.map((linha) => [...linha, ''] as LinhaTabela);
	return comLinhas(dados, linhas);
}

export function inserirLinha(dados: DadosTabela): DadosTabela {
	// No fim da tabela nada está coberto, então a linha nova nasce livre.
	const vazias: LinhaTabela = Array.from({ length: Math.max(1, colunasDaTabela(dados)) }, () => '');
	return comLinhas(dados, [...dados.linhas, vazias]);
}

export function removerLinha(dados: DadosTabela, linha: number): DadosTabela {
	if (dados.linhas.length <= 1 || linha < 0 || linha >= dados.linhas.length) return dados;
	const tabela = montarTabela(dados);
	const linhas = dados.linhas.map((crua, indiceLinha) => {
		if (indiceLinha >= linha) return crua;
		return crua.map((celula, indice) => {
			const render = tabela.linhas[indiceLinha]?.celulas.find((item) => item.indice === indice);
			const rowspan = render?.rowspan ?? 1;
			// Só encolhe quem atravessa a linha removida; o resto fica igual.
			if (indiceLinha + rowspan <= linha) return celula;
			return comoValor({ ...comoAvancada(celula), rowspan: Math.max(1, rowspan - 1) });
		});
	});
	linhas.splice(linha, 1);
	return comLinhas(dados, linhas);
}

export function removerColuna(dados: DadosTabela, coluna: number): DadosTabela {
	const tabela = montarTabela(dados);
	if (tabela.colunas <= 1 || coluna < 0 || coluna >= tabela.colunas) return dados;
	const linhas = dados.linhas.map((crua, indiceLinha) => {
		const saida: LinhaTabela = [];
		crua.forEach((celula, indice) => {
			const render = tabela.linhas[indiceLinha]?.celulas.find((item) => item.indice === indice);
			if (!render) {
				saida.push(celula);
				return;
			}
			const fim = render.coluna + render.colspan - 1;
			if (coluna < render.coluna || coluna > fim) {
				saida.push(celula);
				return;
			}
			// A célula que cobre a coluna removida: sai inteira se começa nela,
			// senão perde só a coluna que a coluna levou junto.
			if (render.coluna === coluna) return;
			saida.push(comoValor({ ...comoAvancada(celula), colspan: Math.max(1, render.colspan - 1) }));
		});
		return saida;
	});
	return comLinhas(dados, linhas);
}

/**
 * Mescla o retângulo selecionado numa célula. O texto de todas entra na mesclada
 * (ninguém é descartado) e um retângulo que corta uma célula existente é
 * recusado — mesclar não pode produzir tabela que não seja HTML válido.
 */
export function mesclar(dados: DadosTabela, area: AreaTabela): DadosTabela | null {
	const alvo = normalizarArea(area);
	const tabela = montarTabela(dados);
	const celulas = celulasNaArea(tabela, alvo);
	if (celulas.length < 2 || !areaValida(tabela, alvo)) return null;

	// `areaValida` garante que o retângulo é coberto por células inteiras, então a
	// célula do canto vira a mesclada (o texto de todas entra nela).
	const base = celulas.find(
		(celula) => celula.linha === alvo.linha0 && celula.coluna === alvo.coluna0
	);
	const primeira = base ?? celulas[0];
	const absorvidas = new Set(celulas.map((celula) => chave(celula.linha, celula.indice)));

	// Quantas linhas da área continuam com célula depois da mescla. Linha que
	// perde todas (a área cobria ela inteira) sai da tabela: o `<tr>` vazio tem o
	// mesmo desenho e não dá para selecionar no editor.
	let restantes = 0;
	for (let linha = alvo.linha0; linha <= alvo.linha1; linha++) {
		const crua = dados.linhas[linha] ?? [];
		const sobrou =
			linha === primeira.linha || crua.some((_, indice) => !absorvidas.has(chave(linha, indice)));
		if (sobrou) restantes++;
	}

	const textos = celulas.map((celula) => celula.texto.trim()).filter((texto) => texto !== '');
	const alinhamento = celulas.find((celula) => celula.alinhamento !== null)?.alinhamento;
	const nova: CelulaAvancada = {
		texto: textos.join(' '),
		colspan: alvo.coluna1 - alvo.coluna0 + 1,
		rowspan: Math.max(1, restantes)
	};
	if (celulas.every((celula) => celula.th)) nova.th = true;
	if (alinhamento) nova.alinhamento = alinhamento;

	const linhas = dados.linhas
		.map((crua, indiceLinha) => {
			if (indiceLinha < alvo.linha0 || indiceLinha > alvo.linha1) {
				return crua as LinhaTabela | null;
			}
			const saida: LinhaTabela = [];
			crua.forEach((celula, indice) => {
				if (!absorvidas.has(chave(indiceLinha, indice))) {
					saida.push(celula);
					return;
				}
				if (indiceLinha === primeira.linha && indice === primeira.indice) {
					saida.push(comoValor(nova));
				}
			});
			// Linha da área que perdeu todas as células sai da tabela.
			return saida.length === 0 ? null : saida;
		})
		.filter((linha): linha is LinhaTabela => linha !== null);

	return comLinhas(dados, linhas);
}

/**
 * Separa as células mescladas dentro da área: cada uma volta a ser
 * `colspan × rowspan` células, as vagas nascem vazias (herdando o `th` e o
 * alinhamento) e o texto fica na primeira — é o que mantém o texto de todos.
 */
export function separar(dados: DadosTabela, area: AreaTabela): DadosTabela {
	const alvo = normalizarArea(area);
	const tabela = montarTabela(dados);
	const celulas = celulasNaArea(tabela, alvo).filter(
		(celula) => celula.colspan > 1 || celula.rowspan > 1
	);
	if (celulas.length === 0) return dados;

	const alvos = new Map(celulas.map((celula) => [chave(celula.linha, celula.indice), celula]));
	// Células de baixo que a mescla cobria: entram na linha delas na posição da coluna.
	const preenchimentos = new Map<number, { coluna: number; celula: CelulaTabela }[]>();
	for (const celula of celulas) {
		const vazia = comoValor({
			texto: '',
			...(celula.th ? { th: true } : {}),
			...(celula.alinhamento ? { alinhamento: celula.alinhamento } : {})
		});
		for (let linha = celula.linha + 1; linha < celula.linha + celula.rowspan; linha++) {
			const faixa = preenchimentos.get(linha) ?? [];
			for (let coluna = celula.coluna; coluna < celula.coluna + celula.colspan; coluna++) {
				faixa.push({ coluna, celula: vazia });
			}
			preenchimentos.set(linha, faixa);
		}
	}

	const linhas = dados.linhas.map((crua, indiceLinha) => {
		const posicionadas: { coluna: number; celula: CelulaTabela }[] = [];
		crua.forEach((celula, indice) => {
			const destino = alvos.get(chave(indiceLinha, indice));
			if (destino) {
				// A própria célula perde o span; as colunas que ela cobria viram
				// células vazias na mesma linha (as linhas de baixo vêm dos
				// preenchimentos).
				for (let coluna = destino.coluna; coluna < destino.coluna + destino.colspan; coluna++) {
					posicionadas.push({
						coluna,
						celula:
							coluna === destino.coluna
								? comoValor({
										texto: destino.texto,
										...(destino.th ? { th: true } : {}),
										...(destino.alinhamento ? { alinhamento: destino.alinhamento } : {})
									})
								: comoValor({ texto: '', ...(destino.th ? { th: true } : {}) })
					});
				}
				return;
			}
			const render = tabela.linhas[indiceLinha]?.celulas.find((item) => item.indice === indice);
			posicionadas.push({ coluna: render?.coluna ?? posicionadas.length, celula });
		});

		for (const item of preenchimentos.get(indiceLinha) ?? []) posicionadas.push(item);
		return posicionadas.sort((a, b) => a.coluna - b.coluna).map((item) => item.celula);
	});

	return comLinhas(dados, linhas);
}
