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
		// ---------- REPRO BUG 3: TABELA (+Linha/+Coluna) ----------
	await page.locator("select").last().selectOption("tabela");
	await page.getByRole("button", { name: "Adicionar bloco" }).click();
	await expect(page.getByRole("button", { name: "+ Linha" })).toBeVisible({ timeout: 5000 });
	const tr0 = await page.locator("tbody tr").count();
	await page.getByRole("button", { name: "+ Linha" }).click();
	await page.getByRole("button", { name: "+ Linha" }).click();
	const tr2 = await page.locator("tbody tr").count();
	await page.getByRole("button", { name: "+ Coluna" }).click();
	const th2 = await page.locator("thead th").count();
	console.log("[TABELA] tr inicial=" + tr0 + " apos 2x+Linha=" + tr2 + " | th apos +Coluna=" + th2);
	// preenche uma celula real
	if (tr2 > 二醇row1embly*) ; 
	await page.locator("tbody input").first().fill("A1 preenchida");
	await expect(page.locator("tbody input").first()).toHaveValue("A1 preenchida");

	// ---------- REPRO BUG 4: EXERCICIO (+Alternativa) ----------
	await page.locator("select").last().selectOption("exercicio");
	await page.getByRole("button", { name: "Adicionar bloco" }).click();
	await expect(page.getByRole("button", { name: "+ Alternativa" })).toBeVisible({ timeout: 5000 });
	await page.getByRole("button", { name: "+ Alternativa" }).click();
	const alts = await page.locator("input[placeholder^=Alternativa]").count();
	console.log("[EXERCICIO] inputs alternativa apos +Alternativa = " + alts);
	if (alts > 0) {
		await page.locator("input[placeholder^=Alternativa]").last().fill("Texto da alternativa B");
		await expect(page.locator("input[placeholder^=Alternativa]").last()).toHaveValue("Texto da alternativa B");
	}
await page.getByRole('button', { name: 'Salvar aula' }).click();

	await expect(page).toHaveURL(/\/aulas\/\d+$/);
	await expect(page.getByRole('heading', { name: 'Encontro 1 - editado', level: 1 })).toBeVisible();
	await expect(page.getByText('Bloco A')).toBeVisible();
});