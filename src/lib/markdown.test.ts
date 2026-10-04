import { describe, expect, it } from 'vitest';
import { markdownParaHtml, urlSegura } from './markdown';

describe('markdownParaHtml', () => {
	it('mantém parágrafo e formatação básica', () => {
		expect(markdownParaHtml('**negrito** e *itálico*')).toBe(
			'<p><strong>negrito</strong> e <em>itálico</em></p>'
		);
	});

	it('quebra linha simples em <br> (conteúdo antigo com quebras)', () => {
		expect(markdownParaHtml('linha 1\nlinha 2')).toBe('<p>linha 1<br>linha 2</p>');
	});

	it('lê título, lista e citação', () => {
		expect(markdownParaHtml('## Seção')).toBe('<h2>Seção</h2>');
		expect(markdownParaHtml('- a\n- b')).toBe('<ul>\n<li>a</li>\n<li>b</li>\n</ul>');
		expect(markdownParaHtml('> nota')).toBe('<blockquote>\n<p>nota</p>\n</blockquote>');
	});

	it('lê link e imagem com URL segura', () => {
		expect(markdownParaHtml('[aula](https://exemplo.test/aula)')).toBe(
			'<p><a href="https://exemplo.test/aula">aula</a></p>'
		);
		expect(markdownParaHtml('![alt](https://exemplo.test/a.png)')).toBe(
			'<p><img src="https://exemplo.test/a.png" alt="alt"></p>'
		);
	});

	it('não confia em javascript: nem em data:', () => {
		expect(markdownParaHtml('[clique](javascript:alert(1))')).toBe('<p>clique</p>');
		expect(markdownParaHtml('![x](data:text/html;base64,PHN2Zz4=)')).toBe('<p>x</p>');
	});

	it('escapa HTML bruto em vez de injetar', () => {
		// `<script>` é bloco de HTML para o `marked`: sai escapado, sem `<p>`.
		expect(markdownParaHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
		expect(markdownParaHtml('<b>oi</b>')).toContain('&lt;b&gt;oi&lt;/b&gt;');
	});

	it('código inline e cercado saem escapados, sem interpretar math', () => {
		expect(markdownParaHtml('`a < b`')).toBe('<p><code>a &lt; b</code></p>');
		// O bloco cercado é tokenizado antes do inline: o `$` aqui é só texto.
		expect(markdownParaHtml('```\n$x$ <b>\n```')).toBe(
			'<pre><code>$x$ &lt;b&gt;\n</code></pre>'
		);
	});

	it('tabela GFM', () => {
		expect(markdownParaHtml('| a | b |\n| - | - |\n| 1 | 2 |')).toContain('<table>');
	});

	it('renderiza $...$ com KaTeX no servidor', () => {
		const html = markdownParaHtml('a área é $x^2$ do total');
		expect(html).toContain('<span class="katex">');
		expect(html).not.toContain('$x^2$');
	});

	it('renderiza $$...$$ de linha própria como fórmula de destaque', () => {
		const html = markdownParaHtml('$$\n\\frac{1}{2}\n$$');
		expect(html).toContain('class="markdown-formula"');
		expect(html).toContain('katex-display');
	});

	it('segue a convenção de $lib/matematica: $ não atravessa linha', () => {
		// Mesmo caso de `matematica.test.ts`: texto com `$` em linhas diferentes.
		expect(markdownParaHtml('a $x\ny$ b')).not.toContain('katex');
	});

	it('não trata $ solto como math', () => {
		// Mesmo caso de `matematica.test.ts`: um `$` só, sem par, é texto.
		expect(markdownParaHtml('custa $ 5')).not.toContain('katex');
		expect(markdownParaHtml('$$')).not.toContain('katex');
	});

	it('formula dentro de item de lista sai', () => {
		expect(markdownParaHtml('- custo $x$')).toContain('<li>custo <span class="katex">');
	});

	it('string vazia não gera HTML', () => {
		expect(markdownParaHtml('')).toBe('');
	});
});

describe('urlSegura', () => {
	it('aceita http, https, mailto e caminho interno', () => {
		expect(urlSegura('https://exemplo.test')).toBe(true);
		expect(urlSegura('http://exemplo.test')).toBe(true);
		expect(urlSegura('mailto:a@b.test')).toBe(true);
		expect(urlSegura('/apostilas/1')).toBe(true);
		expect(urlSegura('#seção')).toBe(true);
	});

	it('recusa protocolo perigoso, protocolo relativo e lixo', () => {
		expect(urlSegura('javascript:alert(1)')).toBe(false);
		expect(urlSegura('JaVaScRiPt:alert(1)')).toBe(false);
		expect(urlSegura('data:text/html,x')).toBe(false);
		expect(urlSegura('//exemplo.test')).toBe(false);
		expect(urlSegura('   ')).toBe(false);
	});
});