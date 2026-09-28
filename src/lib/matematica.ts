// Fórmulas dentro de um texto corrido (enunciado, alternativa, explicação).
// Convenção: o conteúdo entre `$` e `$` é LaTeX e sai renderizado com KaTeX —
// assim a alternativa continua sendo uma string só no banco, sem bloco filho.
//
// Só o conteúdo entre `$` vira KaTeX; o canvas do resultado (`$lib/imagem`) não
// tem como desenhar KaTeX, então lá a fórmula aparece no código LaTeX.

export type ParteTexto = { tipo: 'texto'; valor: string } | { tipo: 'latex'; valor: string };

const MATEMATICA = /\$([^$\n]+?)\$/g;

export function partesMatematicas(texto: string): ParteTexto[] {
	const partes: ParteTexto[] = [];
	let cursor = 0;

	for (const achado of texto.matchAll(MATEMATICA)) {
		const inicio = achado.index ?? 0;
		if (inicio > cursor) partes.push({ tipo: 'texto', valor: texto.slice(cursor, inicio) });
		partes.push({ tipo: 'latex', valor: achado[1] });
		cursor = inicio + achado[0].length;
	}

	if (cursor < texto.length) partes.push({ tipo: 'texto', valor: texto.slice(cursor) });
	return partes;
}

export function temMatematica(texto: string): boolean {
	return partesMatematicas(texto).some((parte) => parte.tipo === 'latex');
}
