import { test, expect, type Page } from '@playwright/test';
import { SENHA_E2E } from './ambiente';

async function entrar(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();
}

/** Editor de uma aula nova já com um bloco de simulação. */
async function editorComSimulacao(page: Page) {
	await entrar(page);
	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(`Simulação E2E ${Date.now()}`);
	await page.getByRole('button', { name: 'Criar' }).click();
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);
	await page.getByLabel('Título da aula').fill('Aula com simulação');
	await page
		.getByRole('group', { name: 'Adicionar bloco' })
		.getByRole('button', { name: 'Simulação' })
		.click();
	return page;
}

const previa = (page: Page) => page.locator('iframe[title="Prévia da simulação"]');
const leitura = (page: Page) => page.locator('iframe[title="Simulação interativa"]');

/**
 * Mede o canvas dentro da moldura: `sobra` é quanto a caixa do canvas estourou a da
 * moldura (0 = tomou a largura toda) e `buffer` é o tamanho real do desenho, que é
 * o que decide a nitidez. `buffer` menor que a largura exibida é upscale (desfocado);
 * os dois juntos são o "what you see is what you get" do bloco.
 */
async function medidas(page: Page, titulo: string) {
	const moldura = await page.locator(`iframe[title="${titulo}"]`).boundingBox();
	const canvas = page.frameLocator(`iframe[title="${titulo}"]`).locator('canvas');
	const dentro = await canvas.boundingBox();
	const buffer = Number((await canvas.getAttribute('width')) ?? 0);
	if (!moldura || !dentro) return { sobra: -999, buffer: 0, largura: 0 };
	return { sobra: dentro.width - moldura.width, buffer, largura: moldura.width };
}

test('bloco novo já vem em p5 rodando e o canvas toma a largura da moldura', async ({ page }) => {
	await editorComSimulacao(page);

	// Isca de segurança: a iframe do professor roda com `sandbox` e **sem**
	// `allow-same-origin`, então o código do aluno não alcança a sessão nem o DOM.
	await expect(previa(page)).toHaveAttribute('sandbox', 'allow-scripts');

	// E o p5 também não pode reclamar do storage no start-up.
	await expect(page.locator('[data-simulacao-erro]')).toHaveCount(0);

	// Se a lib carregou e o modo global pegou, existe canvas dentro da iframe — e ele
	// ocupa a caixa toda, com o desenho do tamanho da caixa (nítido, sem esticar).
	await expect(
		page.frameLocator('iframe[title="Prévia da simulação"]').locator('canvas')
	).toBeVisible({ timeout: 15000 });
	await expect
		.poll(async () => (await medidas(page, 'Prévia da simulação')).sobra, { timeout: 15000 })
		.toBeLessThanOrEqual(2);
	await expect
		.poll(async () => (await medidas(page, 'Prévia da simulação')).buffer, { timeout: 15000 })
		.toBeGreaterThan((await medidas(page, 'Prévia da simulação')).largura - 2);
});

test('erro no código aparece e corrigir o código volta a rodar', async ({ page }) => {
	await editorComSimulacao(page);
	const codigo = page.getByLabel('Código da simulação');
	await expect(codigo).toHaveValue(/function draw/);

	// Debounce de 700 ms: dá para ver o esqueleto quebrado na mensagem de erro.
	await codigo.fill('function draw() { naoExisteNada(); }');
	await expect(page.getByText('naoExisteNada')).toBeVisible({ timeout: 15000 });

	await codigo.fill('function setup() { createCanvas(200, 120); }\nfunction draw() { background(0); }');
	await expect(page.locator('[data-simulacao-erro]')).toHaveCount(0, { timeout: 15000 });
	// O código corrigido rodou: o canvas voltou (no erro nem existe) e já está do
	// tamanho da caixa, e não nos 200x120 do `createCanvas` do teste.
	await expect(
		page.frameLocator('iframe[title="Prévia da simulação"]').locator('canvas')
	).toBeVisible({ timeout: 15000 });
	await expect
		.poll(async () => (await medidas(page, 'Prévia da simulação')).buffer, { timeout: 15000 })
		.toBeGreaterThan(200);
});

test('trocar p5 por q5 troca o exemplo e continua rodando', async ({ page }) => {
	await editorComSimulacao(page);
	const codigo = page.getByLabel('Código da simulação');
	await expect(codigo).toHaveValue(/circle/);

	await page.getByLabel('Biblioteca').selectOption('q5');

	// Código ainda no exemplo: veio o exemplo do q5 junto (`ellipse` no lugar de
	// `circle`), senão o professor ficaria com um rascunho de p5 rodando em q5.
	await expect(codigo).toHaveValue(/ellipse/);

	// Prova de que o q5 rodou de verdade: a instância existe — o construtor do q5 morre
	// no getter de `localStorage` (documento sandboxed sem `allow-same-origin`) e aí
	// `instances` fica vazio — e o buffer do canvas acompanha a caixa, senão sobraria o
	// canvas padrão de 200x200 esticado pelo CSS. Precisa ser `poll` porque a moldura só
	// troca 700 ms depois (debounce): medir antes mediria o canvas p5 ainda na tela.
	await expect
		.poll(
			async () => {
				const instanciada = await page
					.frameLocator('iframe[title="Prévia da simulação"]')
					.locator('body')
					.evaluate(() => {
						const q5 = (window as unknown as { q5?: { instances?: unknown[] } }).q5;
						return (q5?.instances?.length ?? 0) > 0;
					});
				if (!instanciada) return false;
				const tamanho = await medidas(page, 'Prévia da simulação');
				return tamanho.buffer >= tamanho.largura - 2;
			},
			{ timeout: 15000 }
		)
		.toBe(true);

	// E nenhum alerta: as duas libs montam `storeItem`/`getItem` no start-up, então o
	// dublê de armazenamento da casca é o que mantém isso quieto.
	await expect(page.locator('[data-simulacao-erro]')).toHaveCount(0);

	// Código já editado é do professor: a troca de biblioteca não mexe nele.
	await codigo.fill('function draw() { naoExisteNada(); }');
	await page.getByLabel('Biblioteca').selectOption('p5');
	await expect(codigo).toHaveValue(/naoExisteNada/);
});

test('código e visualização alinham no topo e as configurações ficam numa linha abaixo', async ({
	page
}) => {
	await editorComSimulacao(page);

	const codigo = await page.getByLabel('Código da simulação').boundingBox();
	const previa = await page.locator('[data-simulacao-preview]').boundingBox();
	const biblioteca = await page.getByLabel('Biblioteca').boundingBox();
	if (!codigo || !previa || !biblioteca) throw new Error('caixa sem medidas');

	// Topo a topo: é o que o professor pediu (antes a visualação ficava abaixo das
	// configurações, dentro da coluna direita).
	expect(Math.abs(codigo.y - previa.y)).toBeLessThanOrEqual(2);

	// As configurações vão numa linha só, embaixo das duas colunas.
	expect(biblioteca.y).toBeGreaterThan(codigo.y + codigo.height);
	expect(biblioteca.y).toBeGreaterThan(previa.y + previa.height);

	// Sem o retângulo de "rodando" sobre a visualização.
	await expect(page.getByText('rodando')).toHaveCount(0);
});

test('toggle do bloco vai da edição para a visão do aluno e volta', async ({ page }) => {
	await editorComSimulacao(page);
	const modo = page.getByRole('group', { name: 'Modo da simulação' });
	await expect(modo.getByRole('button', { name: 'Editar' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);

	// Face do aluno: a mesma da leitura (outro título de iframe, botão de reiniciar),
	// sem o editor de código e sem as configurações.
	await modo.getByRole('button', { name: 'Visualizar' }).click();
	await expect(page.getByLabel('Código da simulação')).toHaveCount(0);
	await expect(page.getByLabel('Biblioteca')).toHaveCount(0);
	await expect(page.getByLabel('Altura')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Reiniciar simulação' })).toBeVisible();
	await expect(leitura(page)).toBeVisible();
	await expect
		.poll(async () => (await medidas(page, 'Simulação interativa')).sobra, { timeout: 15000 })
		.toBeLessThanOrEqual(2);

	// E volta para a edição, com código e configurações no lugar.
	await modo.getByRole('button', { name: 'Editar' }).click();
	await expect(page.getByLabel('Código da simulação')).toBeVisible();
	await expect(page.getByLabel('Biblioteca')).toBeVisible();
	await expect(modo.getByRole('button', { name: 'Editar' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
});

test('altura do bloco governa a caixa da simulação', async ({ page }) => {
	await editorComSimulacao(page);
	const caixa = page.locator('[data-simulacao-preview]');
	await expect(caixa).toHaveCSS('height', '240px');

	await page.getByLabel('Altura').fill('420');
	await expect(caixa).toHaveCSS('height', '420px');
});

test('aluno recebe a simulação rodando e a impressão mostra o código', async ({ page }) => {
	await editorComSimulacao(page);
	const codigo = 'function setup() { createCanvas(420, 260); }\nfunction draw() { background(0, 90, 160); }';
	await page.getByLabel('Código da simulação').fill(codigo);
	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);

	// Leitura: roda sozinho, sem o professor clicar em nada.
	await expect(leitura(page)).toHaveAttribute('sandbox', 'allow-scripts');
	await expect(
		page.frameLocator('iframe[title="Simulação interativa"]').locator('canvas')
	).toBeVisible({ timeout: 15000 });

	// É a rechegada do bloco de simulação que estava em uso: o `createCanvas(420, 260)`
	// do professor vira o tamanho da tela do aluno, em vez de esticar 420 px por cima do
	// desenho (era o que saía desfocado). Buffer >= largura exibida é o que garante a
	// nitidez, e o `background` azul prova que o código salvo rodou.
	const tamanho = await medidas(page, 'Simulação interativa');
	expect(tamanho.sobra).toBeLessThanOrEqual(2);
	expect(tamanho.buffer).toBeGreaterThanOrEqual(tamanho.largura - 2);
	expect(tamanho.buffer).toBeGreaterThan(420);
	await expect
		.poll(
			async () =>
				page
					.frameLocator('iframe[title="Simulação interativa"]')
					.locator('canvas')
					// Pixel do canto: o `background` do código salvo, o que prova que o
					// desenho rodou na tela do aluno (e não só que existe um canvas).
					.evaluate((elemento) => {
						const contexto = elemento.getContext('2d');
						if (!contexto) return '';
						const dados = contexto.getImageData(0, 0, 1, 1).data;
						return `${dados[0]}, ${dados[1]}, ${dados[2]}`;
					}),
			{ timeout: 15000 }
		)
		.toBe('0, 90, 160');

	// O canvas não sai no papel: a impressão mostra o código, que é o que o aluno
	// precisa para rodar o mesmo desenho em p5/q5. O link abre em outra aba.
	const impressao = page.waitForEvent('popup');
	await page.getByRole('link', { name: 'Imprimir/PDF' }).click();
	const paginaImpressao = await impressao;
	await expect(paginaImpressao.locator('iframe')).toHaveCount(0);
	await expect(paginaImpressao.locator('pre code')).toContainText('background(0, 90, 160)');
	await expect(paginaImpressao.getByText('Simulação interativa (p5)')).toBeVisible();
	await paginaImpressao.close();
});