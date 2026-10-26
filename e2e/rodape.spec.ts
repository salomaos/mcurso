import { test, expect } from '@playwright/test';
import { SENHA_E2E } from './ambiente';

async function entrar(page: import('@playwright/test').Page) {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();
}

test('rodapé aparece nas páginas normais com nome e ano', async ({ page }) => {
	await entrar(page);
	await page.goto('/');

	const rodape = page.getByRole('contentinfo');
	await expect(rodape).toBeVisible();
	await expect(rodape).toContainText('mcurso');
	await expect(rodape).toContainText(`© ${new Date().getFullYear()}`);
});

test('rodapé some na impressão e na apresentação da aula', async ({ page }) => {
	await entrar(page);

	// ---- cria apostila e aula com um bloco de texto ----
	const titulo = `Rodapé E2E ${Date.now()}`;
	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(titulo);
	await page.getByRole('button', { name: 'Criar' }).click();
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);

	await page.getByRole('button', { name: 'Texto', exact: true }).click();
	await page.getByRole('textbox', { name: 'Texto do bloco' }).fill('Conteúdo do slide');
	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);

	// Leitura normal: o rodapé está lá.
	await expect(page.getByRole('contentinfo')).toBeVisible();

	// Impressão: abre em outra aba (`target="_blank"`), sem rodapé.
	const [abaImpressao] = await Promise.all([
		page.context().waitForEvent('page'),
		page.getByRole('link', { name: 'Imprimir/PDF' }).click()
	]);
	await abaImpressao.waitForLoadState();
	await expect(abaImpressao).toHaveURL(/\/imprimir$/);
	await expect(abaImpressao.getByRole('contentinfo')).toHaveCount(0);
	await abaImpressao.close();

	// Apresentação: sem rodapé (a tela cheia cobre o layout).
	await page.getByRole('link', { name: 'Apresentar' }).click();
	await expect(page).toHaveURL(/\/apresentar$/);
	await expect(page.getByRole('contentinfo')).toHaveCount(0);
});
