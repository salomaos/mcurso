import { test, expect, type Page } from '@playwright/test';
import { SENHA_E2E } from './ambiente';

test.use({ viewport: { width: 1280, height: 1200 } });

/** Na home o cartão é o próprio link, então ele é `a` direto no container. */
const CARTOES_HOME = 'main a.card';
/** No painel da apostila as aulas ficam em um `ul` por seção (agrupadas). */
const CARTOES_AULAS = 'section[data-arrasto-lista] ul > li';

async function entrar(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();
}

async function criarApostila(page: Page, titulo: string) {
	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(titulo);
	await page.getByRole('button', { name: 'Criar' }).click();
	await expect(page).toHaveURL(/\/apostilas\/\d+/);
	return new URL(page.url()).pathname;
}

async function criarAulas(page: Page, painel: string, titulos: string[]) {
	for (const titulo of titulos) {
		await page.goto(painel);
		await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
		await expect(page).toHaveURL(/\/editar/);
		await page.getByLabel('Título da aula').fill(titulo);
		await page.getByRole('button', { name: 'Salvar aula' }).click();
		await expect(page).toHaveURL(/\/aulas\/\d+$/);
	}
	await page.goto(painel);
}

type Caixa = { x: number; y: number; largura: number };

/** Caixa dos dois primeiros cartões, para comparar linha e coluna. */
async function duasCaixas(page: Page, seletor: string): Promise<[Caixa, Caixa]> {
	await expect.poll(() => page.locator(seletor).count()).toBeGreaterThanOrEqual(2);
	const [primeira, segunda] = await page
		.locator(seletor)
		.evaluateAll((nos) =>
			nos.slice(0, 2).map((no) => {
				const caixa = no.getBoundingClientRect();
				return { x: caixa.x, y: caixa.y, largura: caixa.width };
			})
		);
	return [primeira!, segunda!];
}

function naMesmaLinha([primeira, segunda]: [Caixa, Caixa]) {
	return Math.abs(primeira.y - segunda.y) < 4 && segunda.x > primeira.x;
}

function empilhados([primeira, segunda]: [Caixa, Caixa]) {
	return segunda.y > primeira.y + 4;
}

test('botão de criar fica na mesma linha, à direita, com descrição longa', async ({ page }) => {
	await entrar(page);
	await page.goto('/exercicios');

	const botao = page.getByRole('button', { name: '+ Nova atividade' });
	await expect(botao).toBeVisible();

	// A descrição da página é longa o bastante para um `flex-wrap` jogar as
	// ações para a linha de baixo. O cabeçalho não quebra mais: o texto é que
	// encolhe, e o botão segue ao lado do título na mesma linha.
	const caixaBotao = await botao.boundingBox();
	const caixaTitulo = await page.getByRole('heading', { level: 1 }).boundingBox();
	expect(caixaBotao).not.toBeNull();
	expect(caixaTitulo).not.toBeNull();
	expect(Math.abs(caixaBotao!.y - caixaTitulo!.y)).toBeLessThanOrEqual(8);

	// E alinhado à direita: a borda direita do botão encosta na borda direita do
	// conteúdo (o padding lateral do `.container` da lib fica de fora).
	const direitaConteudo = await page.locator('main .container').first().evaluate((no) => {
		const caixa = no.getBoundingClientRect();
		return caixa.right - parseFloat(getComputedStyle(no).paddingRight);
	});
	const bordaDireita = caixaBotao!.x + caixaBotao!.width;
	expect(Math.abs(bordaDireita - direitaConteudo)).toBeLessThanOrEqual(2);
});

test('aluno alterna lista/grade na home e a escolha sobrevive ao recarregar', async ({ page }) => {
	await entrar(page);
	const marca = `Visao ${Date.now()}`;
	await criarApostila(page, `${marca} um`);
	await criarApostila(page, `${marca} dois`);
	await page.context().clearCookies();

	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();
	// O aluno não cria apostila, mas alterna a visão como o professor.
	await expect(page.getByRole('button', { name: 'Nova apostila' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Ver em lista' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	expect(empilhados(await duasCaixas(page, CARTOES_HOME))).toBe(true);

	await page.getByRole('button', { name: 'Ver em grade' }).click();
	expect(naMesmaLinha(await duasCaixas(page, CARTOES_HOME))).toBe(true);

	await page.reload();
	await expect(page.getByRole('button', { name: 'Ver em grade' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	expect(naMesmaLinha(await duasCaixas(page, CARTOES_HOME))).toBe(true);

	await page.getByRole('button', { name: 'Ver em lista' }).click();
	expect(empilhados(await duasCaixas(page, CARTOES_HOME))).toBe(true);
});

test('a visão escolhida vale nas outras listas', async ({ page }) => {
	await entrar(page);
	const marca = `Visao compartilhada ${Date.now()}`;
	await criarApostila(page, `${marca} um`);
	const painel = await criarApostila(page, `${marca} dois`);
	await criarAulas(page, painel, ['Aula um', 'Aula dois']);

	await page.getByRole('button', { name: 'Ver em grade' }).click();
	expect(naMesmaLinha(await duasCaixas(page, CARTOES_AULAS))).toBe(true);

	// A preferência é uma só (mesma chave no localStorage), então a home já abre
	// em grade.
	await page.goto('/');
	expect(naMesmaLinha(await duasCaixas(page, CARTOES_HOME))).toBe(true);

	// E voltar para lista vale nas duas.
	await page.getByRole('button', { name: 'Ver em lista' }).click();
	await page.goto(painel);
	await expect(page.getByRole('button', { name: 'Ver em lista' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	expect(empilhados(await duasCaixas(page, CARTOES_AULAS))).toBe(true);
});

test('o cartão do aluno não abre espaço da alça que ele não tem', async ({ page }) => {
	await entrar(page);
	const painel = await criarApostila(page, `Sem alça ${Date.now()}`);
	await criarAulas(page, painel, ['Aula sem alça']);
	await page.context().clearCookies();

	await page.goto(painel);
	await expect(page.getByRole('heading', { name: 'Aula sem alça' })).toHaveCount(0);
	const cartao = page.locator('section[data-arrasto-lista] ul > li').first();
	await expect(cartao).toBeVisible();

	// Sem a alça do editor, o cartão do aluno encosta na borda esquerda do
	// conteúdo (o `gap` do flex não pode abrir para o wrapper vazio).
	const desvio = await cartao.evaluate((no) => {
		const conteudo = no.closest('.container');
		if (!conteudo) return -1;
		const caixaConteudo = conteudo.getBoundingClientRect();
		const recuo = parseFloat(getComputedStyle(conteudo).paddingLeft);
		return no.getBoundingClientRect().x - (caixaConteudo.left + recuo);
	});
	expect(Math.abs(desvio)).toBeLessThanOrEqual(1);
});

test('o cartão solto continua um item de lista com as ações dentro', async ({ page }) => {
	await entrar(page);
	const titulo = `Anexo lista ${Date.now()}`;
	await page.goto('/anexos');
	await page.getByRole('button', { name: '+ Novo anexo' }).click();
	await expect(page).toHaveURL(/\/anexos\/\d+\/editar/);
	await page.getByLabel('Título do anexo').fill(titulo);
	await page.getByRole('button', { name: 'Salvar anexo' }).click();
	await expect(page).toHaveURL(/\/anexos\/\d+$/);

	await page.goto('/anexos');
	const cartao = page.locator('li', { hasText: titulo }).first();
	await expect(cartao).toBeVisible();
	// O `li` do painel solto é contrato dos E2Es de anexo e atividade.
	await expect(cartao.getByRole('link', { name: titulo })).toBeVisible();
	await expect(cartao.getByRole('button', { name: 'Excluir' })).toBeVisible();

	await page.getByRole('button', { name: 'Ver em grade' }).click();
	await expect(cartao).toBeVisible();
	await expect(cartao.getByRole('link', { name: titulo })).toBeVisible();
	await expect(cartao.getByRole('button', { name: 'Excluir' })).toBeVisible();
});