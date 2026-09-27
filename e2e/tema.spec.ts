import { test, expect } from '@playwright/test';
import { SENHA_E2E } from './ambiente';

const PAGINA = '/';

async function entrar(page: import('@playwright/test').Page) {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();
}

test('tema salvo já vale na primeira pintura, sem o JS do app', async ({ page }) => {
	await page.route('**/_app/immutable/**/*.js', (rota) => rota.abort());

	for (const [salvo, esperado] of [
		['cyberpunk', 'cyberpunk'],
		['cupcake', 'cupcake'],
		['brutalist-dark', 'brutalist-dark'],
		['nao-existe', 'brutalist'],
		[null, 'brutalist']
	] as const) {
		await page.addInitScript(
			([chave, valor]) => {
				if (valor === null) localStorage.removeItem(chave);
				else localStorage.setItem(chave, valor);
			},
			['ahmar-theme', salvo] as const
		);

		await page.goto(PAGINA);
		await expect(page.locator('body')).toHaveAttribute('data-theme', esperado);
	}
});

test('seletor de tema persiste entre recargas', async ({ page }) => {
	await entrar(page);
	await page.goto(PAGINA);

	const seletor = page.getByLabel('Tema');
	await seletor.selectOption('synthwave');
	await expect(page.locator('body')).toHaveAttribute('data-theme', 'synthwave');

	await page.reload();
	await expect(page.locator('body')).toHaveAttribute('data-theme', 'synthwave');
	await expect(seletor).toHaveValue('synthwave');

	await seletor.selectOption('dark');
	await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark');
	await page.reload();
	await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark');
});

test('página sem cache mantém o tema durante a navegação', async ({ page }) => {
	await entrar(page);
	await page.getByLabel('Tema').selectOption('valentine');
	await expect(page.locator('body')).toHaveAttribute('data-theme', 'valentine');

	for (const url of ['/', '/login', '/']) {
		await page.goto(url);
		await expect(page.locator('body')).toHaveAttribute('data-theme', 'valentine');
	}
});
