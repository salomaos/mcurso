import { test, expect } from '@playwright/test';

const SENHA = process.env.APP_MASTER_PASSWORD ?? 'mestradee2e';

test('index é público e mostra as apostilas', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();
	await expect(page.getByRole('main').getByRole('link', { name: 'Nova apostila' })).toHaveCount(0);
});

test('rota protegida redireciona para o login', async ({ page }) => {
	await page.goto('/apostilas/nova');
	await expect(page).toHaveURL(/\/login/);
});

test('faz login com a senha mestra', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();
	await expect(page.getByRole('main').getByRole('link', { name: 'Nova apostila' })).toBeVisible();
});

test('senha errada mostra erro', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill('senha-errada');
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByText('Senha incorreta.')).toBeVisible();
});

test('fluxo completo: cria apostila e aula', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();

	const titulo = `Apostila E2E ${Date.now()}`;
	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(titulo);
	await page.getByRole('button', { name: 'Criar' }).click();

	await expect(page).toHaveURL(/\/apostilas\/\d+/);
	await expect(page.getByLabel('Título')).toHaveValue(titulo);

	await page.getByPlaceholder('Título da aula').fill('Encontro 1');
	await page.getByRole('button', { name: 'Criar e editar' }).click();

	await expect(page).toHaveURL(/\/editar/);
	await page.getByLabel('Título').fill('Encontro 1 - editado');
	await page.getByLabel('Seção/bloco').fill('Bloco A');
	await page.getByRole('button', { name: 'Salvar aula' }).click();

	await expect(page).toHaveURL(/\/aulas\/\d+$/);
	await expect(page.getByRole('heading', { name: 'Encontro 1 - editado', level: 1 })).toBeVisible();
	await expect(page.getByText('Bloco A')).toBeVisible();
});