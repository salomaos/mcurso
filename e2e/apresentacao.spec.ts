import { test, expect } from '@playwright/test';
import { SENHA_E2E } from './ambiente';

test('apresenta blocos como slides e navega por teclado', async ({ page }) => {
	// ---- login ----
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();

	// ---- cria apostila ----
	const titulo = `Apresenta E2E ${Date.now()}`;
	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(titulo);
	await page.getByRole('button', { name: 'Criar' }).click();
	await expect(page).toHaveURL(/\/apostilas\/\d+/);
	await expect(page.getByLabel('Título da apostila')).toHaveText(titulo);

	// ---- cria a aula ----
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);

	await page.getByLabel('Título da aula').click();
	await page.keyboard.press('Control+a');
	await page.keyboard.type('Encontro apresentável');
	await expect(page.getByLabel('Título da aula')).toHaveText('Encontro apresentável');

	await page.getByRole('button', { name: 'Adicionar bloco' }).click();
	await page.getByRole('textbox', { name: 'Texto do bloco' }).nth(0).fill('Slide 1: o ponto inicial');
	await page.getByRole('button', { name: 'Adicionar bloco' }).click();
	await page.getByRole('textbox', { name: 'Texto do bloco' }).nth(1).fill('Slide 2: a conclusão');
	await page.getByRole('button', { name: 'Visualizar' }).click();
	await expect(page.getByRole('button', { name: 'Salvar aula' })).toHaveCount(0);
	await expect(page.getByText('Slide 1: o ponto inicial')).toBeVisible();
	await page.getByRole('button', { name: 'Editar', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Salvar aula' })).toBeVisible();
	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);

	// ---- abre o modo apresentação ----
	await page.getByRole('link', { name: 'Apresentar' }).click();
	await expect(page).toHaveURL(/\/apresentar/);

	// primeiro slide
	await expect(page.getByText('1 / 2')).toBeVisible();
	await expect(page.getByText('Slide 1: o ponto inicial')).toBeVisible();

	await page.getByRole('button', { name: 'Próximo →' }).click();
	await expect(page.getByText('2 / 2')).toBeVisible();
	await page.keyboard.press('ArrowLeft');
	await expect(page.getByText('1 / 2')).toBeVisible();

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
