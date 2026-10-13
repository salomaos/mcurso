import { test, expect, type Page } from '@playwright/test';
import { SENHA_E2E } from './ambiente';

async function entrar(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();
}

/** Editor de uma aula nova já com um bloco HTML. */
async function editorComHtml(page: Page) {
	await entrar(page);
	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(`HTML E2E ${Date.now()}`);
	await page.getByRole('button', { name: 'Criar' }).click();
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);
	await page.getByLabel('Título da aula').fill('Aula com HTML');
	await page
		.getByRole('group', { name: 'Adicionar bloco' })
		.getByRole('button', { name: 'HTML' })
		.click();
	return page;
}

const previa = (page: Page) => page.frameLocator('iframe[title="Prévia do bloco HTML"]');
const leitura = (page: Page) => page.frameLocator('iframe[title="Bloco HTML"]');

test('bloco novo já vem com o exemplo rodando na prévia', async ({ page }) => {
	await editorComHtml(page);

	// Isca de segurança: a iframe roda com `sandbox` e **sem** `allow-same-origin`,
	// então o código do professor não alcança a sessão nem o DOM da página.
	await expect(page.locator('iframe[title="Prévia do bloco HTML"]')).toHaveAttribute(
		'sandbox',
		'allow-scripts'
	);

	await expect(previa(page).locator('#botao')).toBeVisible({ timeout: 15000 });
	await expect(page.locator('[data-html-erro]')).toHaveCount(0);
});

test('script no painel HTML roda; o painel JavaScript roda também', async ({ page }) => {
	await editorComHtml(page);
	const corpo = previa(page).locator('body');

	// `<script>` inline no markup passa a rodar: a casca recria os nós depois do
	// `innerHTML` (innerHTML por si só não executa script).
	await page
		.getByLabel('Código HTML')
		.fill('<p id="prova">oi</p><script>document.body.setAttribute("data-inline", "1")</script>');
	await expect(previa(page).locator('#prova')).toBeVisible({ timeout: 15000 });
	await expect.poll(async () => corpo.getAttribute('data-inline'), { timeout: 15000 }).toBe('1');

	// O painel JS segue rodando do mesmo jeito.
	await page.getByLabel('Código JavaScript').fill('document.body.setAttribute("data-js", "1");');
	await expect.poll(async () => corpo.getAttribute('data-js'), { timeout: 15000 }).toBe('1');
});

test('lib via <script src> no painel HTML carrega, em ordem (caminho do CDN)', async ({ page }) => {
	await editorComHtml(page);
	const corpo = previa(page).locator('body');

	// É o caminho do CDN (Tailwind, dayjs etc.): `<script src>` no markup. A iframe
	// é `srcdoc` e herda a base da página, então um asset da própria app serve de
	// CDN offline. O inline seguinte prova a ordem: a casca espera o `src` carregar
	// antes de rodar o próximo script — é o que faz `tailwind.config` logo após o
	// CDN valer.
	await page
		.getByLabel('Código HTML')
		.fill(
			'<script src="/lib/p5.min.js"></script><script>document.body.setAttribute("data-lib", typeof p5)</script><p id="prova">oi</p>'
		);
	await expect(previa(page).locator('#prova')).toBeVisible({ timeout: 15000 });
	await expect.poll(async () => corpo.getAttribute('data-lib'), { timeout: 20000 }).toBe('function');
});

test('erro no JavaScript aparece e corrigir volta a rodar', async ({ page }) => {
	await editorComHtml(page);
	const js = page.getByLabel('Código JavaScript');

	await js.fill('naoExisteNada();');
	await expect(page.getByText('naoExisteNada')).toBeVisible({ timeout: 15000 });

	await js.fill('document.title = "ok";');
	await expect(page.locator('[data-html-erro]')).toHaveCount(0, { timeout: 15000 });
});

test('toggle do bloco vai da edição para a visão do aluno e volta', async ({ page }) => {
	await editorComHtml(page);
	const modo = page.getByRole('group', { name: 'Modo do bloco HTML' });
	await expect(modo.getByRole('button', { name: 'Editar' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);

	// Face do aluno: a mesma da leitura (outro título de iframe, botão de recarregar),
	// sem os painéis de código e sem as configurações.
	await modo.getByRole('button', { name: 'Visualizar' }).click();
	await expect(page.getByLabel('Código HTML')).toHaveCount(0);
	await expect(page.getByLabel('Código CSS')).toHaveCount(0);
	await expect(page.getByLabel('Código JavaScript')).toHaveCount(0);
	await expect(page.getByLabel('Altura')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Recarregar' })).toBeVisible();
	await expect(leitura(page).locator('#botao')).toBeVisible({ timeout: 15000 });

	// E volta para a edição, com os painéis e as configurações no lugar.
	await modo.getByRole('button', { name: 'Editar' }).click();
	await expect(page.getByLabel('Código HTML')).toBeVisible();
});

test('altura do bloco governa a caixa', async ({ page }) => {
	await editorComHtml(page);
	const caixa = page.locator('[data-html-preview]');
	await expect(caixa).toHaveCSS('height', '300px');

	await page.getByLabel('Altura').fill('420');
	await expect(caixa).toHaveCSS('height', '420px');
});

test('aluno recebe o HTML rodando e a impressão mostra o código', async ({ page }) => {
	await editorComHtml(page);
	await page.getByLabel('Código HTML').fill('<p id="marca">Bloco HTML E2E</p>');
	await page.getByLabel('Código CSS').fill('#marca { color: rgb(0, 90, 160); }');
	await page.getByLabel('Código JavaScript').fill('document.title = "rodou";');
	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);

	// Leitura: roda sozinho. O texto (HTML) e a cor (CSS) provam que os painéis
	// chegaram na tela do aluno.
	await expect(page.locator('iframe[title="Bloco HTML"]')).toHaveAttribute(
		'sandbox',
		'allow-scripts'
	);
	const marca = leitura(page).locator('#marca');
	await expect(marca).toHaveText('Bloco HTML E2E', { timeout: 15000 });
	await expect(marca).toHaveCSS('color', 'rgb(0, 90, 160)');

	// A iframe não sai no papel: a impressão mostra o código, que é o que o aluno
	// precisa para reproduzir o bloco. O link abre em outra aba.
	const impressao = page.waitForEvent('popup');
	await page.getByRole('link', { name: 'Imprimir/PDF' }).click();
	const paginaImpressao = await impressao;
	await expect(paginaImpressao.locator('iframe')).toHaveCount(0);
	await expect(paginaImpressao.getByText('Bloco HTML — código')).toBeVisible();
	await expect(paginaImpressao.locator('pre code', { hasText: 'Bloco HTML E2E' })).toBeVisible();
	await paginaImpressao.close();
});
