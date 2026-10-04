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

/**
 * Arrasta a alça de um card até antes/depois do alvo. A library decide o destino
 * pelo **centro do card arrastado**, não pelo ponteiro, então o helper compensa
 * a distância entre a alça e o topo do card: o centro do card cai 8px antes (ou
 * depois) do meio do alvo. Não usar a borda do alvo direto porque a altura dos
 * cards muda com o bloco aberto (editor) ou fechado (prévia).
 */
async function arrastar(page: Page, alca: Locator, alvo: Locator, lado: 'antes' | 'depois' = 'antes') {
	const origem = await alca.boundingBox();
	const destino = await alvo.boundingBox();
	if (!origem || !destino) throw new Error('elemento sem caixa visível');

	const cartao = await alca.evaluate((no) => {
		const caixa = no.closest('[data-arrasto-item]')?.getBoundingClientRect();
		return { topo: caixa?.top ?? 0, altura: caixa?.height ?? 0 };
	});

	const x = origem.x + origem.width / 2;
	const y = origem.y + origem.height / 2;
	const desvio = y - cartao.topo;
	const meio = destino.y + destino.height / 2 - cartao.altura / 2 + desvio;
	const fimY = lado === 'antes' ? meio - 8 : meio + 8;

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

/**
 * Ordem dos blocos de texto pelo conteúdo. O bloco de texto só tem `textarea`
 * enquanto está em edição (fora dela mostra o markdown já formatado), então a
 * leitura aceita os dois: `value` do campo ou o texto do bloco renderizado.
 */
function textos(page: Page) {
	return page.locator('[data-canvas-block]').evaluateAll((itens) =>
		itens.map((item) => {
			const campo = item.querySelector('textarea');
			if (campo) return (campo as HTMLTextAreaElement).value;
			return item.querySelector('.markdown')?.textContent ?? '';
		})
	);
}

test('arrastar bloco no canvas reordena os blocos', async ({ page }) => {
	await entrar(page);
	await criarApostila(page, `Blocos E2E ${Date.now()}`);
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);
	await page.getByLabel('Título da aula').fill('Aula dos blocos');

	const cartoes = page.locator('[data-canvas-block]');

	for (const texto of ['A', 'B', 'C']) {
		await page.getByRole('button', { name: 'Texto', exact: true }).click();
		await page.getByLabel('Texto do bloco').last().click();
		await page.keyboard.type(texto);
	}

	await expect.poll(() => textos(page)).toEqual(['A', 'B', 'C']);

	await arrastar(page, page.getByRole('button', { name: /Mover bloco 3/ }), cartoes.first(), 'antes');
	await expect.poll(() => textos(page)).toEqual(['C', 'A', 'B']);
	await semTransform(page);

	await arrastar(page, page.getByRole('button', { name: /Mover bloco 1/ }), cartoes.last(), 'depois');
	await expect.poll(() => textos(page)).toEqual(['A', 'B', 'C']);
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

	const ordem = () => textos(page);
	for (const texto of ['A', 'B', 'C']) {
		await page.getByRole('button', { name: 'Texto', exact: true }).click();
		await page.getByLabel('Texto do bloco').last().click();
		await page.keyboard.type(texto);
	}

	await page.getByRole('button', { name: /Mover bloco 3/ }).press('ArrowUp');
	await expect.poll(() => ordem()).toEqual(['A', 'C', 'B']);

	await page.getByRole('button', { name: /Mover bloco 2/ }).press('ArrowUp');
	await expect.poll(() => ordem()).toEqual(['C', 'A', 'B']);

	await page.getByRole('button', { name: /Mover bloco 1/ }).press('ArrowDown');
	await expect.poll(() => ordem()).toEqual(['A', 'C', 'B']);
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
