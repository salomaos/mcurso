// Markdown do bloco de texto. A string continua sendo a fonte da verdade no
// banco — mesma convenção do KaTeX em `$lib/matematica`: o HTML só existe na
// hora de renderizar, e quem escreve é o professor (usuário único), não o aluno.
//
// Quatro decisões que não são óbvias:
//
// - **HTML bruto é escapado**. O professor escreve markdown, não HTML. Escapar na
//   fonte dispensa sanitizar depois: o único HTML da página é o do próprio `marked`
//   e o do KaTeX. Era a barreira que o escape do Svelte dava no `{bloco.conteudo}`.
// - **`breaks: true`**. O bloco de texto era texto puro com `whitespace-pre-wrap`,
//   então uma linha nova era uma linha nova na tela. Sem `breaks`, o markdown
//   juntaria em parágrafo único o conteúdo que já está no banco.
// - **`$...$` vira KaTeX no servidor**, não no cliente como o bloco `formula`.
//   `renderToString` é isomórfico e o CSS do KaTeX já é global, então sai no HTML
//   do SSR: impressão/PDF saem certos e não há flash. A convenção é a mesma de
//   `$lib/matematica` (não atravessa linha). Um bloco `$$...$$` em linha própria é
//   fórmula de destaque.
// - **Link e imagem só com URL segura**. O `marked` não filtra `javascript:` no
//   `href` (o sanitizador dele foi removido), então o filtro fica aqui — mesma
//   ideia de `ehUrlSegura` em `$lib/blocks`. URL fora da lista vira texto puro.
//
// Limitação aceita da v1: `$...$` **dentro de código inline** (`` `$x$` ``) vira
// fórmula, porque extensão inline do `marked` roda antes do tokenizador de
// código. Para mostrar o LaTeX cru, use um bloco cercado com ``` — esse caminho
// é tokenizado antes e está correto.

import { Marked, type RendererObject, type TokenizerAndRendererExtension, type Tokens } from 'marked';
import katex from 'katex';

const ESCAPAS: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escaparHtml(texto: string): string {
	return texto.replace(/[&<>"']/g, (caractere) => ESCAPAS[caractere]);
}

/**
 * A assinatura do renderer do `marked` é `Tokens.Generic`, então o `latex` do
 * tokenizador precisa sair por aqui. Só o nosso tokenizador monta essa
 * extensão, então o campo não pode faltar — o `''` é rede de segurança.
 */
function latexDo(token: Tokens.Generic): string {
	const latex = (token as { latex?: unknown }).latex;
	return typeof latex === 'string' ? latex : '';
}

/** `http`, `https`, `mailto` e caminho interno. Fora disso, o link vira texto. */
export function urlSegura(valor: string): boolean {
	const alvo = valor.trim();
	if (alvo === '' || alvo.startsWith('//')) return false;
	if (alvo.startsWith('/') || alvo.startsWith('#')) return true;
	try {
		return ['http:', 'https:', 'mailto:'].includes(new URL(alvo).protocol);
	} catch {
		return false;
	}
}

function htmlFormula(latex: string, destaque: boolean): string {
	try {
		return katex.renderToString(latex, { displayMode: destaque, throwOnError: false });
	} catch {
		return escaparHtml(latex);
	}
}

// Inline: `$x$`. O grupo segue a convenção de `$lib/matematica` — sem `$` dentro e
// sem atravessar linha — e `$$` fica de fora porque o primeiro caractere depois do
// `$` não pode ser `$`.
const formulaInline = {
	name: 'formulaInline',
	level: 'inline',
	start(src: string) {
		return src.indexOf('$');
	},
	tokenizer(src: string) {
		const achado = /^\$([^$\n]+?)\$/.exec(src);
		if (!achado) return undefined;
		return { type: 'formulaInline', raw: achado[0], latex: achado[1] };
	},
	renderer(token: Tokens.Generic) {
		return htmlFormula(latexDo(token), false);
	}
} satisfies TokenizerAndRendererExtension;

// Bloco: `$$...$$` em linha própria (sozinho, sem indentação).
const formulaBloco = {
	name: 'formulaBloco',
	level: 'block',
	start(src: string) {
		return src.indexOf('$$');
	},
	tokenizer(src: string) {
		const achado = /^\$\$([^]+?)\$\$(?:\n+|$)/.exec(src);
		if (!achado) return undefined;
		return { type: 'formulaBloco', raw: achado[0], latex: achado[1].trim() };
	},
	renderer(token: Tokens.Generic) {
		return `<div class="markdown-formula">${htmlFormula(latexDo(token), true)}</div>`;
	}
} satisfies TokenizerAndRendererExtension;

const renderizador = {
	html(token: { text: string }) {
		return escaparHtml(token.text);
	},
	link(token: { href: string; tokens: unknown }) {
		if (!urlSegura(token.href)) return this.parser.parseInline(token.tokens as never);
		return false;
	},
	image(token: { href: string; text: string }) {
		if (!urlSegura(token.href)) return escaparHtml(token.text);
		return false;
	}
} satisfies RendererObject;

const marked = new Marked({
	gfm: true,
	breaks: true,
	extensions: [formulaInline, formulaBloco],
	renderer: renderizador
});

/** Markdown do professor → HTML confiável (único `innerHTML` de conteúdo do app). */
export function markdownParaHtml(markdown: string): string {
	// O `marked` devolve uma `\n` no fim; para o `{@html}` não é diferença, mas
	// comparar string na spec fica ridículo.
	return (marked.parse(markdown, { async: false }) as string).trim();
}