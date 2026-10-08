import { test, expect, type Page } from '@playwright/test';
import { SENHA_E2E } from './ambiente';

/** Na home o cartão é o próprio link. */
const CARTOES_HOME = 'main a.card';
/** No painel da apostila as aulas ficam em um `ul` por seção. */
const CARTOES_AULAS = 'section[data-arrasto-lista] ul > li';
/** Nos painéis soltos (anexos/atividades) o cartão é o `li`. */
const CARTOES_SOLTOS = 'main ul > li';

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

async function criarAnexo(page: Page, titulo: string) {
	await page.goto('/anexos');
	await page.getByRole('button', { name: '+ Novo anexo' }).click();
	await expect(page).toHaveURL(/\/anexos\/\d+\/editar/);
	await page.getByLabel('Título do anexo').fill(titulo);
	await page.getByRole('button', { name: 'Salvar anexo' }).click();
	await expect(page).toHaveURL(/\/anexos\/\d+$/);
}

test('busca por título filtra as apostilas da home', async ({ page }) => {
	await entrar(page);
	const token = `Filtroapostila${Date.now()}`;
	await page.goto('/');
	// Os specs compartilham o banco, então a referência é o total antes de criar.
	const antes = await page.locator(CARTOES_HOME).count();

	await criarApostila(page, `${token} um`);
	await criarApostila(page, `${token} dois`);
	await criarApostila(page, 'Apostila fora do filtro');

	await page.goto('/');
	await expect(page.locator(CARTOES_HOME)).toHaveCount(antes + 3);

	const busca = page.getByLabel('Buscar apostila por título');
	await busca.fill(token);
	await expect(page.locator(CARTOES_HOME)).toHaveCount(2);
	await expect(page.getByRole('link', { name: `${token} dois` })).toBeVisible();

	await busca.fill(`${token} zzz`);
	await expect(page.getByText(`Nada encontrado para "${token} zzz"`)).toBeVisible();
	await expect(page.locator(CARTOES_HOME)).toHaveCount(0);

	await busca.fill('');
	await expect(page.locator(CARTOES_HOME)).toHaveCount(antes + 3);
});

test('busca por título filtra as aulas do painel da apostila', async ({ page }) => {
	await entrar(page);
	const token = `Filtroaula${Date.now()}`;
	const painel = await criarApostila(page, token);
	await criarAulas(page, painel, [`${token} alfa`, `${token} beta`]);

	// Painel da apostila: o banco dos outros specs não entra aqui.
	await expect(page.locator(CARTOES_AULAS)).toHaveCount(2);

	const busca = page.getByLabel('Buscar aula por título');
	await busca.fill('alfa');
	await expect(page.locator(CARTOES_AULAS)).toHaveCount(1);
	// O cartão da aula não é um link (as ações é que levam para ela).
	await expect(page.locator(CARTOES_AULAS).first()).toContainText(`${token} alfa`);

	await busca.fill('zzz sem resultado');
	await expect(page.getByText('Nada encontrado para "zzz sem resultado"')).toBeVisible();
	await expect(page.locator(CARTOES_AULAS)).toHaveCount(0);
	// A alça de arrasto some com a busca: a ordem só salva na lista completa.
	await expect(page.getByRole('button', { name: new RegExp(`Mover a aula ${token}`) })).toHaveCount(
		0
	);

	await busca.fill('');
	await expect(page.locator(CARTOES_AULAS)).toHaveCount(2);
	await expect(page.getByRole('button', { name: `Mover a aula ${token} alfa` })).toBeVisible();
});

test('busca por título filtra anexos e atividades', async ({ page }) => {
	await entrar(page);
	const token = `Filtrosolto${Date.now()}`;

	await criarAnexo(page, `${token} anexo`);
	await criarAnexo(page, 'Anexo fora do filtro');
	await page.goto('/anexos');

	const buscaAnexo = page.getByLabel('Buscar anexo por título');
	await buscaAnexo.fill(token);
	await expect(page.locator(CARTOES_SOLTOS)).toHaveCount(1);
	await buscaAnexo.fill(`${token} zzz`);
	await expect(page.getByText(`Nada encontrado para "${token} zzz"`)).toBeVisible();
	await expect(page.locator(CARTOES_SOLTOS)).toHaveCount(0);

	await page.goto('/exercicios');
	await page.getByRole('button', { name: '+ Nova atividade' }).click();
	await expect(page).toHaveURL(/\/exercicios\/\d+\/editar/);
	await page.getByLabel('Título da atividade').fill(`${token} atividade`);
	// Atividade sem pergunta nenhuma não salva (o servidor recusa com 400).
	await page.getByRole('button', { name: 'Dissertativa', exact: true }).click();
	await page.getByLabel('Pergunta da atividade').last().fill('Pergunta de teste');
	await page.getByRole('button', { name: 'Salvar atividade' }).click();
	await expect(page).toHaveURL(/\/exercicios\/\d+$/);

	await page.goto('/exercicios');
	const buscaAtividade = page.getByLabel('Buscar atividade por título');
	await buscaAtividade.fill(token);
	await expect(page.locator(CARTOES_SOLTOS)).toHaveCount(1);
	await expect(page.getByRole('link', { name: `${token} atividade` })).toBeVisible();
});
