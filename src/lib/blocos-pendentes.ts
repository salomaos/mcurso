// Avisos de bloco com o papel não cumprido: passou pelo `normalizarBlocos`
// (estrutura válida), mas está vazio ou sem alvo. Só o professor vê (import e
// editor) — o aluno nunca. O editor usa `blocosPendentes` (bloco já
// normalizado); a prévia da importação usa `pendenciasDeImportacao`, que lê o
// JSON cru e avisa também de link interno dependendo de resolução.

import { TIPOS_BLOCO, type Bloco, type Blocos } from '$lib/blocks';
import { lerTabela, tabelaVazia } from '$lib/tabela';
import type { ImportacaoBloco } from '$lib/importar';

export type Pendencia = { indice: number; rotulo: string; motivo: string };

const ROTULO_POR_TIPO = new Map<string, string>(TIPOS_BLOCO.map((tipo) => [tipo.id, tipo.rotulo]));

function rotuloDoTipo(tipo: string): string {
	return ROTULO_POR_TIPO.get(tipo) ?? tipo;
}

function ehTexto(valor: unknown): boolean {
	return typeof valor === 'string' && valor.trim() !== '';
}

export function blocosPendentes(blocos: Blocos): Pendencia[] {
	const pendentes: Pendencia[] = [];
	blocos.forEach((bloco, indice) => {
		const motivo = motivoDoBloco(bloco);
		if (motivo) pendentes.push({ indice: indice + 1, rotulo: rotuloDoTipo(bloco.tipo), motivo });
	});
	return pendentes;
}

function motivoDoBloco(bloco: Bloco): string | null {
	switch (bloco.tipo) {
		case 'titulo':
			return bloco.texto.trim() ? null : 'título vazio';
		case 'texto':
			return bloco.conteudo.trim() ? null : 'texto vazio';
		case 'codigo':
			return bloco.codigo.trim() ? null : 'código vazio';
		case 'mermaid':
			return bloco.diagrama.trim() ? null : 'diagrama vazio';
		case 'imagem':
			return bloco.src.trim() ? null : 'sem endereço de imagem';
		case 'tabela':
			return tabelaVazia(bloco) ? 'tabela vazia' : null;
		case 'formula':
			return bloco.latex.trim() ? null : 'fórmula vazia';
		case 'exercicio':
			if (!bloco.pergunta.trim()) return 'sem enunciado';
			return bloco.alternativas.some((alternativa) => !alternativa.trim())
				? 'tem alternativa em branco'
				: null;
		case 'dissertativa':
			return bloco.pergunta.trim() ? null : 'sem enunciado';
		case 'link':
			return bloco.rotulo.trim() ? null : 'sem rótulo';
		case 'simulacao':
			return bloco.codigo.trim() ? null : 'código vazio';
		case 'html':
			// Só é pendência se os três painéis estiverem vazios: um bloco de CSS
			// puro (ou só de marcação) cumpre o papel.
			return bloco.html.trim() || bloco.css.trim() || bloco.js.trim() ? null : 'código vazio';
	}
}

// Prévia da importação: JSON cru, então além dos vazios avisa quando um link
// interno ainda depende de resolução na criação (por id precisa existir; por
// título/ordem resolve no servidor).
export function pendenciasDeImportacao(blocos: ImportacaoBloco[]): Pendencia[] {
	const pendentes: Pendencia[] = [];

	const acrescentar = (indice: number, tipo: string, motivo: string) => {
		pendentes.push({ indice, rotulo: rotuloDoTipo(tipo), motivo });
	};

	blocos.forEach((bloco, indice) => {
		const tipo = typeof bloco.tipo === 'string' ? bloco.tipo : '';
		const posicao = indice + 1;

		if (tipo === 'link') {
			if (!ehTexto(bloco.rotulo)) acrescentar(posicao, tipo, 'sem rótulo');
			const tipoLink = String(bloco.tipoLink ?? '');
			if (tipoLink === 'aula' || tipoLink === 'anexo' || tipoLink === 'exercicio') {
				const temAlvoId = Number.isInteger(bloco.alvoId) && Number(bloco.alvoId) > 0;
				const temAlvoLogico =
					ehTexto(bloco.alvoTitulo) ||
					(Number.isInteger(bloco.alvoOrdem) && Number(bloco.alvoOrdem) > 0);
				if (!temAlvoId && !temAlvoLogico) {
					acrescentar(posicao, tipo, 'link interno sem alvo (use "alvoId", "alvoTitulo" ou "alvoOrdem")');
				} else if (tipoLink !== 'aula' && temAlvoLogico) {
					acrescentar(posicao, tipo, 'link para anexo/atividade: o alvo precisa existir (será conferido ao criar)');
				}
			}
			return;
		}

		switch (tipo) {
			case 'titulo':
				if (!ehTexto(bloco.texto)) acrescentar(posicao, tipo, 'título vazio');
				break;
			case 'texto':
				if (!ehTexto(bloco.conteudo)) acrescentar(posicao, tipo, 'texto vazio');
				break;
			case 'codigo':
				if (!ehTexto(bloco.codigo)) acrescentar(posicao, tipo, 'código vazio');
				break;
			case 'mermaid':
				if (!ehTexto(bloco.diagrama)) acrescentar(posicao, tipo, 'diagrama vazio');
				break;
			case 'imagem':
				if (!ehTexto(bloco.src)) acrescentar(posicao, tipo, 'sem endereço de imagem');
				break;
			case 'formula':
				if (!ehTexto(bloco.latex)) acrescentar(posicao, tipo, 'fórmula vazia');
				break;
			case 'tabela': {
				// Lê o formato cru (novo ou antigo) e pergunta ao modelo se sobrou
				// alguma célula com texto.
				const tabela = lerTabela(bloco);
				if (!tabela || tabelaVazia(tabela)) acrescentar(posicao, tipo, 'tabela vazia');
				break;
			}
			case 'exercicio': {
				const alternativas = Array.isArray(bloco.alternativas) ? bloco.alternativas : [];
				if (!ehTexto(bloco.pergunta)) acrescentar(posicao, tipo, 'sem enunciado');
				else if (alternativas.length === 0 || alternativas.some((alternativa) => !ehTexto(alternativa))) {
					acrescentar(posicao, tipo, 'sem alternativas (ou alternativa em branco)');
				}
				break;
			}
			case 'dissertativa':
				if (!ehTexto(bloco.pergunta)) acrescentar(posicao, tipo, 'sem enunciado');
				break;
			case 'simulacao':
				if (!ehTexto(bloco.codigo)) acrescentar(posicao, tipo, 'código vazio');
				break;
			case 'html':
				if (!ehTexto(bloco.html) && !ehTexto(bloco.css) && !ehTexto(bloco.js)) {
					acrescentar(posicao, tipo, 'código vazio');
				}
				break;
		}
	});

	return pendentes;
}