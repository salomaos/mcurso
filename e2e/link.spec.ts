import { test, expect, type Page } from '@playwright/test';
import { SENHA_E2E } from './ambiente';

async function entrar(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();
}

async function criarApostila(page: Page, titulo: string) {
	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(titulo);
	await page.getByRole('button', { name: 'Criar' }).click();
	await expect(page).toHaveURL(/\/apostilas\/\d+/);
}

async function criarAula(page: Page, titulo: string) {
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);
	await page.getByLabel('Título da aula').fill(titulo);
}

// O link externo é o mais simples de montar (não depende de alvo existente).
async function criarLink(page: Page, rotulo: string, url: string) {
	await page.getByRole('button', { name: 'Link', exact: true }).click();
	await page.getByLabel('Texto do link').fill(rotulo);
	await page.getByLabel('URL', { exact: true }).fill(url);
}

// Cada link é bloco próprio (ocupa a linha inteira), então dois links seguidos
// ficam um em cima do outro — tanto na edição quanto na leitura.
test('dois links ficam em coluna, não lado a lado', async ({ page }) => {
	await entrar(page);
	await criarApostila(page, `Link coluna ${Date.now()}`);
	await criarAula(page, 'Aula com links');

	// O grid de criação insere abaixo do bloco selecionado, então o segundo link
	// nasce logo abaixo do primeiro (na ordem).
	await criarLink(page, 'Primeiro', 'https://example.com/1');
	await criarLink(page, 'Segundo', 'https://example.com/2');

	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);

	const primeiro = await page.getByRole('link', { name: /Primeiro/ }).boundingBox();
	const segundo = await page.getByRole('link', { name: /Segundo/ }).boundingBox();
	expect(primeiro).not.toBeNull();
	expect(segundo).not.toBeNull();
	// Um embaixo do outro: o topo do segundo vem depois do rodapé do primeiro.
	expect(segundo!.y).toBeGreaterThanOrEqual(primeiro!.y + primeiro!.height);
});

test('tamanho, largura e posição do link ficam gravados e valem na leitura', async ({ page }) => {
	await entrar(page);
	await criarApostila(page, `Link aparência ${Date.now()}`);
	await criarAula(page, 'Aula com link');

	await criarLink(page, 'Abrir material', 'https://example.com/');

	// Padrões: médio + largura do conteúdo + esquerda.
	const tamanho = page.getByLabel('Tamanho');
	const largura = page.getByLabel('Largura');
	await expect(tamanho).toHaveValue('medio');
	await expect(largura).toHaveValue('conteudo');
	await expect(page.getByLabel('Posição')).toHaveValue('esquerda');

	await tamanho.selectOption('grande');
	await largura.selectOption('full');

	// Com largura total a posição não se aplica (o botão já ocupa a linha).
	await expect(page.getByLabel('Posição')).toHaveCount(0);

	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);

	// Leitura: o link carrega as classes do tamanho e da largura escolhidos.
	const link = page.getByRole('link', { name: /Abrir material/ });
	await expect(link).toHaveClass(/badge/);
	await expect(link).toHaveClass(/py-4/);
	await expect(link).toHaveClass(/w-full/);

	// Volta ao editor: a escolha foi persistida. A camada de configuração só
	// existe com o bloco selecionado, então o clique na prévia vem antes.
	await page.getByRole('link', { name: 'Editar', exact: true }).click();
	await expect(page).toHaveURL(/\/editar$/);
	const bloco = page.locator('[data-canvas-block]').first();
	await bloco.getByRole('group', { name: 'Prévia do bloco link' }).click();
	await expect(bloco.getByLabel('Tamanho')).toHaveValue('grande');
	await expect(bloco.getByLabel('Largura')).toHaveValue('full');

	// Volta ao padrão "pequeno" com posição à direita: a classe da largura some
	// e a linha passa a alinhar o botão à direita.
	await bloco.getByLabel('Tamanho').selectOption('pequeno');
	await bloco.getByLabel('Largura').selectOption('conteudo');
	await bloco.getByLabel('Posição').selectOption('direita');
	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);

	const pequeno = page.getByRole('link', { name: /Abrir material/ });
	await expect(pequeno).toHaveClass(/py-1/);
	await expect(pequeno).not.toHaveClass(/w-full/);
	// A moldura alinha o botão à direita.
	await expect(pequeno.locator('..')).toHaveClass(/items-end/);
});
