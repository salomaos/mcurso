import { test, expect, type Locator, type Page } from '@playwright/test';
import { SENHA_E2E } from './ambiente';

test.use({ viewport: { width: 1280, height: 1200 } });

async function entrar(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();
}

async function criarApostila(page: Page, titulo: string): Promise<string> {
	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(titulo);
	await page.getByRole('button', { name: 'Criar' }).click();
	await expect(page).toHaveURL(/\/apostilas\/\d+/);
	return new URL(page.url()).pathname;
}

async function criarSecoes(page: Page, nomes: string[]) {
	for (const nome of nomes) {
		await page.getByLabel('Nome da nova seção').fill(nome);
		await page.getByRole('button', { name: '+ Criar seção' }).click();
		await expect(page.locator('[data-secao]')).toHaveCount(nomes.indexOf(nome) + 1);
	}
}

async function arrastar(page: Page, alca: Locator, alvo: Locator, lado: 'antes' | 'depois' = 'antes') {
	const origem = await alca.boundingBox();
	const destino = await alvo.boundingBox();
	if (!origem || !destino) throw new Error('elemento sem caixa visível');

	const x = origem.x + origem.width / 2;
	const y = origem.y + origem.height / 2;
	const fimY = lado === 'antes' ? destino.y - 8 : destino.y + destino.height + 8;

	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x, y + (fimY - y) / 2);
	await page.mouse.move(x, fimY, { steps: 10 });
	await page.mouse.up();
}

async function semTransform(page: Page) {
	const sobras = await page
		.locator('[data-arrasto-item]')
		.evaluateAll((itens) =>
			itens
				.map((item, indice) => ({ indice, transform: getComputedStyle(item).transform }))
				.filter((item) => item.transform !== 'none')
		);
	expect(sobras).toEqual([]);
}

test('arrastar bloco no canvas reordena os blocos', async ({ page }) => {
	await entrar(page);
	await criarApostila(page, `Blocos E2E ${Date.now()}`);
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);
	await page.getByLabel('Título da aula').fill('Aula dos blocos');

	const cartoes = page.locator('[data-canvas-block]');
	const ordem = cartoes.locator('.canvas-conteudo');

	for (const texto of ['A', 'B', 'C']) {
		await page.locator('.canvas-adicionar select').selectOption('texto');
		await page.getByRole('button', { name: 'Adicionar bloco' }).click();
		await page.getByLabel('Texto do bloco').last().click();
		await page.keyboard.type(texto);
	}

	await expect(ordem).toHaveText(['A', 'B', 'C']);

	await arrastar(page, page.getByRole('button', { name: /Mover bloco 3/ }), cartoes.first(), 'antes');
	await expect(ordem).toHaveText(['C', 'A', 'B']);
	await semTransform(page);

	await arrastar(page, page.getByRole('button', { name: /Mover bloco 1/ }), cartoes.last(), 'depois');
	await expect(ordem).toHaveText(['A', 'B', 'C']);
	await semTransform(page);

	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);
	await expect(page.getByText('C', { exact: true })).toBeVisible();
});

test('setas do teclado movem o bloco em foco', async ({ page }) => {
	await entrar(page);
	await criarApostila(page, `Teclado E2E ${Date.now()}`);
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);
	await page.getByLabel('Título da aula').fill('Aula do teclado');

	const ordem = page.locator('[data-canvas-block] .canvas-conteudo');
	for (const texto of ['A', 'B', 'C']) {
		await page.locator('.canvas-adicionar select').selectOption('texto');
		await page.getByRole('button', { name: 'Adicionar bloco' }).click();
		await page.getByLabel('Texto do bloco').last().click();
		await page.keyboard.type(texto);
	}

	await page.getByRole('button', { name: /Mover bloco 3/ }).press('ArrowUp');
	await expect(ordem).toHaveText(['A', 'C', 'B']);

	await page.getByRole('button', { name: /Mover bloco 2/ }).press('ArrowUp');
	await expect(ordem).toHaveText(['C', 'A', 'B']);

	await page.getByRole('button', { name: /Mover bloco 1/ }).press('ArrowDown');
	await expect(ordem).toHaveText(['A', 'C', 'B']);
});

test('arrastar seção reordena o catálogo', async ({ page }) => {
	await entrar(page);
	const url = await criarApostila(page, `Seções E2E ${Date.now()}`);
	await criarSecoes(page, ['Parte 1', 'Parte 2', 'Parte 3']);

	const painel = page.locator('[data-secao]');
	await expect(painel).toHaveText([/Parte 1/, /Parte 2/, /Parte 3/]);

	await arrastar(page, page.getByRole('button', { name: 'Mover a seção Parte 3' }), painel.first(), 'antes');
	await expect(painel).toHaveText([/Parte 3/, /Parte 1/, /Parte 2/]);
	await semTransform(page);

	await arrastar(page, page.getByRole('button', { name: 'Mover a seção Parte 3' }), painel.last(), 'depois');
	await expect(painel).toHaveText([/Parte 1/, /Parte 2/, /Parte 3/]);

	await page.goto(url);
	await expect(painel).toHaveText([/Parte 1/, /Parte 2/, /Parte 3/]);
});

test('arrastar aula entre seções muda a seção e a ordem', async ({ page }) => {
	await entrar(page);
	const url = await criarApostila(page, `Aulas E2E ${Date.now()}`);
	await criarSecoes(page, ['Parte 1', 'Parte 2']);

	for (const [aula, secao] of [
		['Aula A', 'Parte 1'],
		['Aula B', 'Parte 2']
	]) {
		await page.goto(url);
		await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
		await expect(page).toHaveURL(/\/editar/);
		await page.getByLabel('Título da aula').fill(aula);
		await page.getByLabel('Seção da aula').selectOption({ label: secao });
		await page.getByRole('button', { name: 'Salvar aula' }).click();
		await expect(page).toHaveURL(/\/aulas\/\d+$/);
	}

	await page.goto(url);
	const cartoes = page.locator('section[data-arrasto-lista] [data-arrasto-item]');
	await expect(cartoes).toHaveText([/Aula A/, /Aula B/]);

	await arrastar(
		page,
		page.getByRole('button', { name: 'Mover a aula Aula A' }),
		cartoes.nth(1),
		'depois'
	);

	await expect(page.getByRole('heading', { name: 'Parte 1', level: 2 })).toHaveCount(0);
	await expect(cartoes).toHaveText([/Aula B/, /Aula A/]);
	await semTransform(page);

	await page.reload();
	await expect(page.getByRole('heading', { name: 'Parte 1', level: 2 })).toHaveCount(0);
	await expect(cartoes).toHaveText([/Aula B/, /Aula A/]);
});
