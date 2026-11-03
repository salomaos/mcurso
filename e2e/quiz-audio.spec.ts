import { test, expect, type Page } from '@playwright/test';
import { SENHA_E2E } from './ambiente';

async function entrar(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();
}

test('trilha sonora: botão de som no host e no aluno, com preferência persistida', async ({
	page,
	browser
}) => {
	await entrar(page);
	const token = `Trilha ${Date.now()}`;

	await page.goto('/quiz');
	await page.getByRole('button', { name: '+ Novo quiz' }).click();
	await expect(page).toHaveURL(/\/quiz\/\d+\/editar/);
	await page.locator('summary', { hasText: 'Colar um JSON pronto' }).click();
	await page
		.getByLabel('JSON do quiz')
		.fill(
			JSON.stringify({
				titulo: token,
				perguntas: [{ pergunta: 'Quanto é 2+2?', alternativas: ['3', '4'], correta: 1, tempo: 15 }]
			})
		);
	await page.getByRole('button', { name: 'Importar perguntas' }).click();
	await page.getByRole('button', { name: 'Salvar quiz' }).click();
	await expect(page).toHaveURL(/\/quiz$/);

	await page.goto('/quiz');
	const cartao = page.locator('main ul > li', { hasText: token });
	await cartao.getByRole('button', { name: 'Iniciar' }).click();
	await expect(page).toHaveURL(/\/quiz\/host\/[A-Z0-9]+/);

	// Host: som ligado por padrão; clicar silencia e persiste no navegador.
	const somHost = page.getByRole('button', { name: 'Som do quiz' });
	await expect(somHost).toHaveAttribute('aria-pressed', 'false');
	await somHost.click();
	await expect(somHost).toHaveAttribute('aria-pressed', 'true');
	expect(await page.evaluate(() => localStorage.getItem('mcurso:quiz-audio:mudo'))).toBe('1');

	// Aluno: botão existe na sala, com preferência independente (outro navegador).
	const codigo = page.url().split('/').pop()!;
	const contexto = await browser.newContext();
	const aluno = await contexto.newPage();
	await aluno.goto('/quiz/jogar');
	await aluno.getByLabel('Código da sala').fill(codigo);
	await aluno.getByLabel('Seu nome').fill('Ouvinte');
	await aluno.getByRole('button', { name: 'Entrar' }).click();
	await expect(aluno).toHaveURL(/\/quiz\/jogar\/[A-Z0-9]+/);
	const somAluno = aluno.getByRole('button', { name: 'Som do quiz' });
	await expect(somAluno).toHaveAttribute('aria-pressed', 'false');
	await somAluno.click();
	await expect(somAluno).toHaveAttribute('aria-pressed', 'true');
	await contexto.close();
});
