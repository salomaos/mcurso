export type NomeIcone =
	| 'titulo'
	| 'texto'
	| 'codigo'
	| 'mermaid'
	| 'imagem'
	| 'link'
	| 'tabela'
	| 'formula'
	| 'exercicio'
	| 'dissertativa'
	| 'mais'
	| 'negrito'
	| 'italico'
	| 'lista'
	| 'listaNumerada'
	| 'citacao'
	| 'linha';

export type Forma =
	| { tipo: 'caminho'; d: string }
	| {
			tipo: 'retangulo';
			x: number;
			y: number;
			largura: number;
			altura: number;
			raio?: number;
	  }
	| { tipo: 'circulo'; cx: number; cy: number; raio: number };

// Desenhos em viewBox 24x24, só traço: o `Icone.svelte` cuida de cor e tamanho.
export const FORMAS_ICONE: Record<NomeIcone, Forma[]> = {
	titulo: [{ tipo: 'caminho', d: 'M5 6h14M12 6v13M9 19h6' }],
	texto: [{ tipo: 'caminho', d: 'M4 6.5h16M4 10.5h16M4 14.5h16M4 18.5h10' }],
	codigo: [
		{ tipo: 'caminho', d: 'm9 8-5 4 5 4' },
		{ tipo: 'caminho', d: 'm15 8 5 4-5 4' }
	],
	mermaid: [
		{ tipo: 'retangulo', x: 3, y: 4, largura: 7, altura: 5, raio: 1 },
		{ tipo: 'retangulo', x: 14, y: 15, largura: 7, altura: 5, raio: 1 },
		{ tipo: 'caminho', d: 'M6.5 9v4a2 2 0 0 0 2 2H14' }
	],
	imagem: [
		{ tipo: 'retangulo', x: 3, y: 5, largura: 18, altura: 14, raio: 2 },
		{ tipo: 'circulo', cx: 8.5, cy: 10, raio: 1.5 },
		{ tipo: 'caminho', d: 'm4 17 4.5-4.5 3.5 3 3-2.5L20 17' }
	],
	link: [
		{ tipo: 'caminho', d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' },
		{ tipo: 'caminho', d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' }
	],
	tabela: [
		{ tipo: 'retangulo', x: 3, y: 5, largura: 18, altura: 14, raio: 1.5 },
		{ tipo: 'caminho', d: 'M3 10h18M3 14.5h18M9 10v9' }
	],
	formula: [{ tipo: 'caminho', d: 'M3 12h2l2 5 4-12h9' }],
	exercicio: [
		{ tipo: 'retangulo', x: 3.5, y: 4, largura: 17, altura: 16, raio: 2 },
		{ tipo: 'caminho', d: 'm8 12.5 2.5 2.5 5-5.5' }
	],
	// Linha de escrita com caneta: bloco de resposta aberta.
	dissertativa: [
		{ tipo: 'caminho', d: 'M4 19.5h16' },
		{ tipo: 'caminho', d: 'M4 15.5h6' },
		{ tipo: 'caminho', d: 'M4 11.5h4' },
		{ tipo: 'caminho', d: 'm14.5 15.5 5.5-5.5 2 2-5.5 5.5-3 .5z' }
	],
	// Fora da lista de blocos: é a ação "adicionar bloco" entre dois blocos do editor.
	mais: [{ tipo: 'caminho', d: 'M12 5v14M5 12h14' }],
	// Ações da barra de formatação do bloco de texto (markdown).
	negrito: [{ tipo: 'caminho', d: 'M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z' }],
	italico: [{ tipo: 'caminho', d: 'M15 5h-4M13 19H9M14 5l-4 14' }],
	lista: [
		{ tipo: 'circulo', cx: 5, cy: 7, raio: 1.25 },
		{ tipo: 'circulo', cx: 5, cy: 12, raio: 1.25 },
		{ tipo: 'circulo', cx: 5, cy: 17, raio: 1.25 },
		{ tipo: 'caminho', d: 'M10 7h9M10 12h9M10 17h6' }
	],
	// Mesma grade da `lista`, mas com 1/2/3 no lugar da bolinha: sem dígito
	// próprio, professor erra a modality só depois de ver o texto quebrado.
	listaNumerada: [
		{ tipo: 'caminho', d: 'M10 7h10M10 12h10M10 17h6' },
		{ tipo: 'caminho', d: 'M4.4 6.2 5.6 5.3V8.8' },
		{ tipo: 'caminho', d: 'M3 12.4c0-.6.5-1 1.1-1s1.1.4 1.1 1c0 .9-2.2 1.2-2.2 2.3h2.3' },
		{ tipo: 'caminho', d: 'M3 17.1c0-.5.5-.9 1.1-.9h.5c.5 0 .9.3.9.7s-.4.7-.9.7h-.5c.6 0 1 .3 1 .8s-.4.8-1 .8H3.1' }
	],
	citacao: [
		{ tipo: 'caminho', d: 'm7 8-3 4 3 4' },
		{ tipo: 'caminho', d: 'm15 8-3 4 3 4' }
	],
	linha: [
		{ tipo: 'caminho', d: 'M4.5 12h15M4.5 9.5v5M19.5 9.5v5' }
	]
};
