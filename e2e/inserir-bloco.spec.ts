import { test, expect, type Page } from '@playwright/test';
import { SENHA_E2E } from './ambiente';

async function entrar(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();
}

/** Abre o editor de uma aula nova já com `tipos` blocos criados pelo grid do fim. */
async function abrirEditor(page: Page, tipos: string[]) {
	await entrar(page);
	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(`Inserção E2E ${Date.now()}`);
	await page.getByRole('button', { name: 'Criar' }).click();
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);
	for (const tipo of tipos) {
		await page.getByRole('button', { name: tipo, exact: true }).click();
	}
}

/** Ordem dos blocos pelo rótulo da alça de arrasto ("Mover bloco 2: Código"). */
function ordem(page: Page) {
	return page
		.getByRole('button', { name: /Mover bloco \d/ })
		.evaluateAll((botoes) => botoes.map((botao) => botao.getAttribute('aria-label')));
}

/** Botão da faixa que fica logo depois do bloco `posicao`. */
function vaoDepoisDe(page: Page, posicao: number) {
	return page.getByRole('button', { name: new RegExp(`^Adicionar bloco depois do bloco ${posicao}:`) });
}

/** Botão da faixa do topo: o vão entre o título/descrição e o primeiro bloco. */
function vaoTopo(page: Page) {
	return page.getByRole('button', { name: /^Adicionar bloco antes do bloco 1:/ });
}

function caixas(page: Page) {
	return page
		.locator('[data-canvas-block]')
		.evaluateAll((itens) =>
			itens.map((item) => {
				const caixa = item.getBoundingClientRect();
				return { top: caixa.top, bottom: caixa.bottom };
			})
		);
}

test('passar o mouse no vão revela o botão sem mexer no layout', async ({ page }) => {
	await abrirEditor(page, ['Título', 'Tabela']);

	const vao = vaoDepoisDe(page, 1);
	await expect(vao).toHaveCSS('opacity', '0');

	const antes = await caixas(page);
	// O vão entre dois blocos continua sendo o `space-y-4` (1rem): o botão
	// flutua, não entra no fluxo como irmão (senão contaria o espaço duas vezes).
	expect(antes[1].top - antes[0].bottom).toBeCloseTo(16, 0);

	await vao.hover();
	await expect(vao).toHaveCSS('opacity', '1');
	expect(await caixas(page)).toEqual(antes);
});

test('o grid do vão cria o bloco naquela posição, ignorando a seleção', async ({ page }) => {
	await abrirEditor(page, ['Título', 'Tabela']);
	await expect(ordem(page)).resolves.toEqual([
		'Mover bloco 1: Título',
		'Mover bloco 2: Tabela'
	]);

	// Deixa o primeiro bloco selecionado: o grid do fim inseriria logo abaixo dele,
	// mas o do vão tem que respeitar o ponto escolhido.
	await page.getByLabel('Editar título').first().click();

	await vaoDepoisDe(page, 1).click();
	const grade = page.getByRole('group', { name: 'Tipos de bloco' });
	await expect(grade).toBeVisible();
	await expect(grade.getByRole('button')).toHaveCount(10);

	await grade.getByRole('button', { name: 'Código' }).click();
	await expect(ordem(page)).resolves.toEqual([
		'Mover bloco 1: Título',
		'Mover bloco 2: Código',
		'Mover bloco 3: Tabela'
	]);

	// A grade fecha depois de criar, para o bloco novo receber o foco de edição.
	await expect(grade).toHaveCount(0);

	// Segundo uso: no vão entre "Código" e "Tabela".
	await vaoDepoisDe(page, 2).click();
	await page
		.getByRole('group', { name: 'Tipos de bloco' })
		.getByRole('button', { name: 'Fórmula' })
		.click();
	await expect(ordem(page)).resolves.toEqual([
		'Mover bloco 1: Título',
		'Mover bloco 2: Código',
		'Mover bloco 3: Fórmula',
		'Mover bloco 4: Tabela'
	]);
});

test('Esc e o clique fora fecham o grid do vão', async ({ page }) => {
	await abrirEditor(page, ['Título', 'Tabela']);

	await vaoDepoisDe(page, 1).click();
	await expect(page.getByRole('group', { name: 'Tipos de bloco' })).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('group', { name: 'Tipos de bloco' })).toHaveCount(0);

	await vaoDepoisDe(page, 1).click();
	await expect(page.getByRole('group', { name: 'Tipos de bloco' })).toBeVisible();
	await page.getByLabel('Título da aula').click();
	await expect(page.getByRole('group', { name: 'Tipos de bloco' })).toHaveCount(0);
	await expect(ordem(page)).resolves.toEqual([
		'Mover bloco 1: Título',
		'Mover bloco 2: Tabela'
	]);
});

test('o grid do fim continua existindo e segue o bloco selecionado', async ({ page }) => {
	await abrirEditor(page, ['Título', 'Tabela']);

	await page.getByLabel('Editar título').first().click();
	await page.getByRole('group', { name: 'Adicionar bloco' }).getByRole('button', { name: 'Texto' }).click();
	await expect(ordem(page)).resolves.toEqual([
		'Mover bloco 1: Título',
		'Mover bloco 2: Texto',
		'Mover bloco 3: Tabela'
	]);

	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);

	await page.getByRole('link', { name: 'Editar' }).click();
	await expect(page).toHaveURL(/\/editar$/);
	await expect(ordem(page)).resolves.toEqual([
		'Mover bloco 1: Título',
		'Mover bloco 2: Texto',
		'Mover bloco 3: Tabela'
	]);
});

test('a faixa do topo cria o primeiro bloco, abaixo do título e da descrição', async ({ page }) => {
	await abrirEditor(page, ['Tabela']);
	await expect(ordem(page)).resolves.toEqual(['Mover bloco 1: Tabela']);

	const antes = await caixas(page);
	await expect(vaoTopo(page)).toHaveCSS('opacity', '0');
	await vaoTopo(page).hover();
	await expect(vaoTopo(page)).toHaveCSS('opacity', '1');
	// O botão flutua no vão: os blocos não se mexem.
	expect(await caixas(page)).toEqual(antes);

	await vaoTopo(page).click();
	const grade = page.getByRole('group', { name: 'Tipos de bloco' });
	await expect(grade).toBeVisible();

	// A tabela está selecionada (veio do grid do fim), então o grid do fim
	// inseriria embaixo dela: a faixa do topo tem que criar no índice 0.
	await grade.getByRole('button', { name: 'Título' }).click();
	await expect(ordem(page)).resolves.toEqual([
		'Mover bloco 1: Título',
		'Mover bloco 2: Tabela'
	]);
	await expect(grade).toHaveCount(0);

	// O bloco novo nasce selecionado, e o do título continua com a faixa de baixo.
	await expect(vaoDepoisDe(page, 1)).toBeVisible();
	await expect(page.getByRole('button', { name: /^Adicionar bloco antes do bloco 1:/ })).toHaveCount(1);

	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);
	await page.getByRole('link', { name: 'Editar' }).click();
	await expect(ordem(page)).resolves.toEqual([
		'Mover bloco 1: Título',
		'Mover bloco 2: Tabela'
	]);
});

/** Anexo e atividade são soltos, mas montam blocos no mesmo `EditorCanvas`. */
const SOLTOS = [
	{ nome: 'anexo', caminho: '/anexos', criar: '+ Novo anexo', url: /\/anexos\/\d+\/editar/ },
	{
		nome: 'atividade',
		caminho: '/exercicios',
		criar: '+ Nova atividade',
		url: /\/exercicios\/\d+\/editar/
	}
];

for (const solto of SOLTOS) {
	test(`a faixa do topo cria o primeiro bloco no ${solto.nome}`, async ({ page }) => {
		await entrar(page);
		await page.goto(solto.caminho);
		await page.getByRole('button', { name: solto.criar }).click();
		await expect(page).toHaveURL(solto.url);

		await page
			.getByRole('group', { name: 'Adicionar bloco' })
			.getByRole('button', { name: 'Tabela' })
			.click();
		await vaoTopo(page).click();
		await page
			.getByRole('group', { name: 'Tipos de bloco' })
			.getByRole('button', { name: 'Código' })
			.click();
		await expect(ordem(page)).resolves.toEqual([
			'Mover bloco 1: Código',
			'Mover bloco 2: Tabela'
		]);
	});
}