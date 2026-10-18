import { test, expect, type Page } from '@playwright/test';
import { SENHA_E2E } from './ambiente';

// PNG 1x1 transparente: o mínimo para o `<img>` carregar de verdade e ter `naturalWidth`.
const PNG_1X1 = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
	'base64'
);

const MB = 1024 * 1024;

async function entrar(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();
}

/** Apostila nova com uma aula, parando no editor dela já com um bloco de imagem. */
async function abrirEditorDeAula(page: Page) {
	const token = `Upload${Date.now()}`;
	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(token);
	await page.getByRole('button', { name: 'Criar' }).click();
	await expect(page).toHaveURL(/\/apostilas\/\d+/);
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);
	await page.getByLabel('Título da aula').fill(`${token} aula`);
	// O bloco de imagem é o dono do "Enviar imagem".
	await page.getByRole('button', { name: 'Imagem', exact: true }).click();
	return token;
}

test('imagem enviada abre para o aluno e sai com cache imutável', async ({ page, browser }) => {
	await entrar(page);
	await abrirEditorDeAula(page);
	await page.locator('input[type="file"]').setInputFiles({
		name: 'grafico.png',
		mimeType: 'image/png',
		buffer: PNG_1X1
	});

	// O upload devolve a URL e o editor já a usa no bloco.
	const campo = page.getByLabel('URL da imagem');
	await expect(campo).toHaveValue(/^\/uploads\/[0-9a-f-]{36}\.png$/);
	const src = await campo.inputValue();

	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);
	const urlAula = page.url();

	// Aluno, sem sessão: é aqui que a imagem aparecia quebrada (401 do /uploads).
	const aluno = await browser.newContext();
	const pagina = await aluno.newPage();
	await pagina.goto(urlAula);
	const imagem = pagina.locator(`img[src="${src}"]`);
	await expect(imagem).toBeVisible();
	await expect
		.poll(() => imagem.evaluate((el) => (el as HTMLImageElement).naturalWidth))
		.toBeGreaterThan(0);

	const resposta = await aluno.request.get(new URL(src, urlAula).href);
	expect(resposta.status()).toBe(200);
	expect(resposta.headers()['content-type']).toBe('image/png');
	// O nome é UUID e o arquivo nunca muda: o navegador pode guardar para sempre.
	expect(resposta.headers()['cache-control']).toContain('immutable');

	// A escrita continua sendo só do professor.
	const negado = await aluno.request.post(new URL('/api/upload', urlAula).href, {
		headers: { origin: new URL(urlAula).origin }
	});
	expect(negado.status()).toBe(401);

	await aluno.close();
});

test('upload recusa extensão fora da lista e arquivo acima do limite', async ({ page }) => {
	await entrar(page);
	await abrirEditorDeAula(page);
	const arquivo = page.locator('input[type="file"]');
	const alerta = page.locator('.alert-error');

	await arquivo.setInputFiles({
		name: 'planilha.exe',
		mimeType: 'application/octet-stream',
		buffer: Buffer.from('MZ')
	});
	await expect(alerta).toHaveText('Extensão ".exe" não permitida');
	await expect(page.getByLabel('URL da imagem')).toHaveValue('');

	await arquivo.setInputFiles({
		name: 'foto.png',
		mimeType: 'image/png',
		buffer: Buffer.alloc(11 * MB)
	});
	await expect(alerta).toHaveText(/passa do limite de 10 MB/);
	await expect(page.getByLabel('URL da imagem')).toHaveValue('');
});
