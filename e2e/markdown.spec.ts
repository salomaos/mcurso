import { test, expect, type Page } from '@playwright/test';
import { SENHA_E2E } from './ambiente';

async function entrar(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();
}

/** Editor de uma aula nova, já com o `conteudo` no bloco de texto. */
async function editorComTexto(page: Page, conteudo: string) {
	await entrar(page);
	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(`Markdown E2E ${Date.now()}`);
	await page.getByRole('button', { name: 'Criar' }).click();
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);
	await page.getByLabel('Título da aula').fill('Aula em markdown');
	await page.getByRole('button', { name: 'Texto', exact: true }).click();
	await page.getByLabel('Texto do bloco').fill(conteudo);
	return page.getByLabel('Texto do bloco');
}

test('markdown do professor vira HTML formatado para o aluno', async ({ page }) => {
	await editorComTexto(
		page,
		'**negrito** e *itálico*\n\n- primeiro\n- segundo\n\n> citação'
	);
	await page.getByRole('button', { name: 'Visualizar' }).click();

	const leitura = page.locator('.markdown');
	await expect(leitura.locator('strong')).toHaveText('negrito');
	await expect(leitura.locator('em')).toHaveText('itálico');
	await expect(leitura.locator('ul li')).toHaveText(['primeiro', 'segundo']);
	await expect(leitura.locator('blockquote')).toHaveText('citação');
});

test('linha nova no texto continua sendo linha nova na leitura', async ({ page }) => {
	// Contrato do `breaks: true`: o bloco era texto puro com quebra preservada.
	await editorComTexto(page, 'primeira linha\nsegunda linha');
	await page.getByRole('button', { name: 'Visualizar' }).click();
	// `<br>` e não quebra de parágrafo: as duas linhas são o mesmo parágrafo.
	await expect(page.locator('.markdown p')).toHaveCount(1);
	await expect(page.locator('.markdown p br')).toHaveCount(1);
});

test('fórmula entre cifrões sai com KaTeX, no servidor', async ({ page }) => {
	await editorComTexto(page, 'a identidade é $x^2 + y^2 = z^2$ hoje');
	await page.getByRole('button', { name: 'Visualizar' }).click();
	await expect(page.locator('.markdown .katex')).toHaveCount(1);
});

test('HTML bruto do markdown é escapado, link perigoso vira texto', async ({ page }) => {
	await editorComTexto(
		page,
		'<script>alert(1)</script>\n\n[clique](javascript:alert(1))'
	);
	await page.getByRole('button', { name: 'Visualizar' }).click();

	const leitura = page.locator('.markdown');
	await expect(leitura.locator('script')).toHaveCount(0);
	await expect(leitura).toContainText('<script>alert(1)</script>');
	// Rótulo continua legível, mas sem `<a>` e sem a URL no HTML.
	await expect(leitura.locator('a')).toHaveCount(0);
	await expect(leitura).toContainText('clique');
	await expect(leitura).not.toContainText('javascript:');
});

test('barra de formatação envolve a seleção e insere marcador de linha', async ({ page }) => {
	const texto = await editorComTexto(page, 'importante');
	await texto.click();
	await page.keyboard.press('Control+a');

	const barra = page.getByRole('group', { name: 'Formatação do texto' });
	await expect(barra).toBeVisible();
	await barra.getByRole('button', { name: 'Negrito' }).click();
	await expect(texto).toHaveValue('**importante**');

	// A seleção vai junto com a formatação (é o que permite formatar de novo).
	await barra.getByRole('button', { name: 'Itálico' }).click();
	await expect(texto).toHaveValue('***importante***');

	await page.keyboard.press('Control+a');
	await barra.getByRole('button', { name: 'Lista', exact: true }).click();
	await expect(texto).toHaveValue('- ***importante***');

	// Clicar fora desmarca o bloco e a barra some com ele.
	await page.getByRole('button', { name: 'Visualizar' }).click();
	await expect(barra).toHaveCount(0);
});

test('barra de formatação insere lista numerada e linha horizontal', async ({ page }) => {
	const texto = await editorComTexto(page, 'um\ndois');
	await texto.click();
	await page.keyboard.press('Control+a');

	const barra = page.getByRole('group', { name: 'Formatação do texto' });
	await barra.getByRole('button', { name: 'Lista numerada' }).click();
	await expect(texto).toHaveValue('1. um\n2. dois');

	await barra.getByRole('button', { name: 'Linha horizontal' }).click();
	await expect(texto).toHaveValue('1. um\n2. dois\n\n---');

	// Título não é ação da barra: heading é bloco de texto próprio (e segue
	// valendo no markdown, só não tem botão).
	await expect(barra.getByRole('button', { name: 'Título' })).toHaveCount(0);

	await texto.press('Escape');
	await expect(page.getByLabel('Editar texto').locator('ol li')).toHaveText(['um', 'dois']);
	await expect(page.getByLabel('Editar texto').locator('hr')).toHaveCount(1);
});

test('fora do foco o bloco mostra a prévia e o clique volta a editar', async ({ page }) => {
	const texto = await editorComTexto(page, '**markdown** formatado');
	await expect(texto).toBeFocused();

	// Clicar em outro campo do formulário tira o foco do texto e o bloco volta
	// para a leitura, que é a mesma marcação que o aluno recebe.
	await page.getByLabel('Título da aula').click();
	const previa = page.getByLabel('Editar texto');
	await expect(previa.locator('strong')).toHaveText('markdown');
	await expect(texto).toHaveCount(0);

	// Clique na leitura abre o editor de novo, com o cursor no fim do texto.
	await previa.click();
	await expect(texto).toHaveValue('**markdown** formatado');
	await expect(texto).toBeFocused();

	await texto.press('Escape');
	await expect(previa).toBeVisible();
});

test('a barra de formatação gruda no topo enquanto o bloco está em edição', async ({ page }) => {
	const texto = await editorComTexto(
		page,
		Array.from({ length: 40 }, (_, linha) => `linha ${linha}`).join('\n')
	);
	const barra = page.getByRole('group', { name: 'Formatação do texto' });
	await expect(barra).toBeVisible();

	// Rola a página: o topo do bloco sai da tela, a barra desce grudada no topo e o
	// texto continua em edição logo abaixo dela.
	await page.evaluate(() => window.scrollTo(0, 700));
	await expect(barra).toBeInViewport();
	const caixa = await barra.boundingBox();
	if (!caixa) throw new Error('barra sem caixa visível');
	expect(caixa.y).toBeLessThanOrEqual(1);
	await expect(texto).toBeInViewport();

	// Sem edição (a prévia), não há barra nenhuma.
	await texto.press('Escape');
	await expect(barra).toHaveCount(0);
});

test('atalho de teclado aplica negrito', async ({ page }) => {
	const texto = await editorComTexto(page, 'atalho');
	await texto.click();
	await page.keyboard.press('Control+a');
	await page.keyboard.press('Control+b');
	await expect(texto).toHaveValue('**atalho**');
});

test('texto salvo mantém o markdown no banco e formata na leitura', async ({ page }) => {
	await editorComTexto(page, '## Seção\n\ntexto com `código`');
	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);

	await expect(page.locator('.markdown h2')).toHaveText('Seção');
	await expect(page.locator('.markdown code')).toHaveText('código');

	// Reabre a edição: o bloco volta em prévia, e o clique nela volta a editar.
	await page.getByRole('link', { name: 'Editar' }).click();
	await expect(page.getByLabel('Editar texto')).toContainText('texto com');
	await page.getByLabel('Editar texto').click();
	await expect(page.getByLabel('Texto do bloco')).toHaveValue('## Seção\n\ntexto com `código`');
});