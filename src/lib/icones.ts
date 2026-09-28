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
	| 'dissertativa';

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
	]
};
