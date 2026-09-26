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

test('canvas edita tabela e exercício e mantém os dados', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();

	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(`Canvas E2E ${Date.now()}`);
	await page.getByRole('button', { name: 'Criar' }).click();
	await page.getByPlaceholder('Título da aula').fill('Aula estruturada');
	await page.getByRole('button', { name: 'Criar e editar' }).click();
	await expect(page).toHaveURL(/\/editar/);

	const tipoNovo = page.locator('.canvas-adicionar select');
	const adicionar = page.getByRole('button', { name: 'Adicionar bloco' });

	await tipoNovo.selectOption('tabela');
	await adicionar.click();
	await page.getByPlaceholder('Coluna').fill('Entrada');
	await page.getByPlaceholder('Valor').fill('A1');
	await page.getByRole('button', { name: '+ Linha' }).click();
	await page.getByRole('button', { name: '+ Coluna' }).click();
	await page.getByPlaceholder('Coluna').nth(1).fill('Saída');
	await page.getByPlaceholder('Valor').nth(1).fill('B1');

	await tipoNovo.selectOption('exercicio');
	await adicionar.click();
	await page.getByLabel('Enunciado').fill('Qual é a resposta?');
	await page.getByPlaceholder('Alternativa A').fill('Primeira');
	await page.getByPlaceholder('Alternativa B').fill('Segunda');
	await page.getByRole('button', { name: '+ Alternativa' }).click();
	await page.getByPlaceholder('Alternativa C').fill('Terceira');
	await page.getByTitle('Marcar como correta').nth(2).check();

	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);
	await expect(page.getByText('B1', { exact: true })).toBeVisible();
	await expect(page.getByText('Terceira', { exact: true })).toBeVisible();

	await page.getByRole('link', { name: 'Editar', exact: true }).click();
	await expect(page).toHaveURL(/\/editar/);
	const blocos = page.locator('[data-canvas-block]');
	await blocos.nth(0).locator('.canvas-visual').click();
	await expect(page.getByPlaceholder('Coluna').first()).toHaveValue('Entrada');
	await expect(page.getByPlaceholder('Coluna').nth(1)).toHaveValue('Saída');
	await expect(page.getByPlaceholder('Valor').nth(1)).toHaveValue('B1');

	await blocos.nth(1).locator('.canvas-visual').click();
	await expect(page.getByLabel('Enunciado')).toHaveValue('Qual é a resposta?');
	await expect(page.getByPlaceholder('Alternativa C')).toHaveValue('Terceira');
	await expect(page.getByTitle('Marcar como correta').nth(2)).toBeChecked();

	const persistidos = JSON.parse(await page.locator('input[name="blocos"]').inputValue()) as {
		linhas: string[][];
		alternativas: string[];
		correta: number;
	}[];
	expect(persistidos[0].linhas[0][1]).toBe('B1');
	expect(persistidos[1].alternativas).toEqual(['Primeira', 'Segunda', 'Terceira']);
	expect(persistidos[1].correta).toBe(2);

	await blocos.nth(0).locator('.canvas-visual').click();
	await blocos.nth(0).getByRole('button', { name: 'Duplicar' }).click();
	await expect(blocos).toHaveCount(3);
	const duplicados = JSON.parse(await page.locator('input[name="blocos"]').inputValue()) as {
		id: string;
		linhas: string[][];
	}[];
	expect(duplicados[1].id).not.toBe(duplicados[0].id);
	expect(duplicados[1].linhas).toEqual(duplicados[0].linhas);

	await page.getByRole('button', { name: 'Visualizar' }).click();
	await expect(page.getByLabel('Enunciado')).toHaveCount(0);
	await expect(page.getByText('Qual é a resposta?')).toBeVisible();
});
