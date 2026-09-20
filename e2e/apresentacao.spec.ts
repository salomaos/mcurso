import { test, expect } from '@playwright/test';

const SENHA = process.env.APP_MASTER_PASSWORD ?? 'mestradee2e';

test('apresenta blocos como slides e navega por teclado', async ({ page }) => {
	// ---- login ----
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();

	// ---- cria apostila ----
	const titulo = `Apresenta E2E ${Date.now()}`;
	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(titulo);
	await page.getByRole('button', { name: 'Criar' }).click();
	await expect(page).toHaveURL(/\/apostilas\/\d+/);
	await expect(page.getByLabel('Título')).toHaveValue(titulo);

	// ---- cria a aula ----
	await page.getByPlaceholder('Título da aula').fill('Encontro apresentável');
	await page.getByRole('button', { name: 'Criar e editar' }).click();
	await expect(page).toHaveURL(/\/editar/);

	// ---- editor: doise blocos de texto (sem acentos no texto para o teste) ----
	await page.getByLabel('Título').fill('Encontro apresentável');
	await page.getByRole('button', { name: 'Adicionar bloco' }).click();
	await page.getByPlaceholder('Texto da seção...').nth(0).fill('Slide 1: o ponto inicial');
	await page.getByRole('button', { name: 'Adicionar bloco' }).click();
	await page.getByPlaceholder('Texto da seção...').nth(1).fill('Slide 2: a conclusão');
	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);

	// ---- abre o modo apresentação ----
	await page.getByRole('link', { name: 'Apresentar' }).click();
	await expect(page).toHaveURL(/\/apresentar/);

	// primeiro slide
	await expect(page.getByText('1 / 2')).toBeVisible();
	await expect(page.getByText('Slide 1: o ponto inicial')).toBeVisible();

	// navega com tecla
	await page.keyboard.press('ArrowRight');
	await expect(page.getByText('2 / 2')).toBeVisible();
	await expect(page.getByText('Slide 2: a conclusão')).toBeVisible();

	// volta
	await page.keyboard.press('ArrowLeft');
	await expect(page.getByText('1 / 2')).toBeVisible();
	await expect(page.getByText('Slide 1: o ponto inicial')).toBeVisible();

	// fecha com Esc …
	await page.keyboard.press('Escape');
	await expect(page).toHaveURL(/\/apostilas\/\d+\/aulas\/\d+$/);
});
