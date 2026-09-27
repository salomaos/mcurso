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
	await expect(page.getByLabel('Título da apostila')).toHaveText(titulo);

	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);

	const tituloAula = page.getByLabel('Título da aula');
	await expect(tituloAula).toBeFocused();
	await page.keyboard.type('Encontro 1');

	await page.getByRole('button', { name: '+ Nova seção' }).click();
	await page.getByLabel('Nome da nova seção').fill('Bloco A');
	await page.getByRole('button', { name: 'Usar seção' }).click();

	await page.getByLabel('Descrição da aula').click();
	await page.keyboard.type('Primeira aula do curso.');

	await page.getByRole('button', { name: 'Salvar aula' }).click();

	await expect(page).toHaveURL(/\/aulas\/\d+$/);
	await expect(page.getByRole('heading', { name: 'Encontro 1', level: 1 })).toBeVisible();
	await expect(page.locator('.badge', { hasText: 'Bloco A' })).toBeVisible();
	await expect(page.getByText('Primeira aula do curso.')).toBeVisible();
});

test('edita título e descrição da apostila direto no conteúdo', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();

	const titulo = `Apostila inline ${Date.now()}`;
	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(titulo);
	await page.getByRole('button', { name: 'Criar' }).click();
	await expect(page).toHaveURL(/\/apostilas\/\d+/);

	const tituloApostila = page.getByLabel('Título da apostila');
	const descricao = page.getByLabel('Descrição da apostila');
	await expect(page.getByRole('button', { name: 'Salvar' })).toBeDisabled();

	await tituloApostila.click();
	await page.keyboard.press('End');
	await page.keyboard.type(' v2');
	await descricao.click();
	await page.keyboard.type('Material completo.');

	await expect(page.getByRole('button', { name: 'Salvar' })).toBeEnabled();
	await page.getByRole('button', { name: 'Salvar' }).click();

	await expect(page.getByLabel('Título da apostila')).toHaveText(`${titulo} v2`);
	await expect(page.getByLabel('Descrição da apostila')).toHaveText('Material completo.');
	await expect(page.getByRole('button', { name: 'Salvar' })).toBeDisabled();

	await page.goto('/');
	await expect(page.getByRole('link', { name: new RegExp(titulo) })).toBeVisible();
	await page.getByRole('link', { name: new RegExp(titulo) }).click();
	await expect(page.getByLabel('Título da apostila')).toHaveText(`${titulo} v2`);
});

test('canvas edita tabela e exercício e mantém os dados', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();

	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(`Canvas E2E ${Date.now()}`);
	await page.getByRole('button', { name: 'Criar' }).click();
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
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
	const enunciado = page.getByLabel('Enunciado do exercício', { exact: true });
	await enunciado.click();
	await page.keyboard.type('Qual é a resposta?');
	await page.getByLabel('Alternativa A', { exact: true }).click();
	await page.keyboard.type('Primeira');
	await page.getByLabel('Alternativa B', { exact: true }).click();
	await page.keyboard.type('Segunda');
	await page.getByRole('button', { name: '+ Alternativa' }).click();
	await page.getByLabel('Alternativa C', { exact: true }).click();
	await page.keyboard.type('Terceira');
	await page.getByTitle('Marcar como correta').nth(2).check();
	await page.getByLabel('Explicação', { exact: true }).click();
	await page.keyboard.type('A terceira é a correta.');

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

	await blocos.nth(1).getByLabel('Enunciado do exercício', { exact: true }).click();
	await expect(enunciado).toHaveText('Qual é a resposta?');
	await expect(page.getByLabel('Alternativa C', { exact: true })).toHaveText('Terceira');
	await expect(page.getByLabel('Explicação', { exact: true })).toHaveText('A terceira é a correta.');
	await expect(page.getByTitle('Marcar como correta').nth(2)).toBeChecked();

	const persistidos = JSON.parse(await page.locator('input[name="blocos"]').inputValue()) as {
		linhas: string[][];
		alternativas: string[];
		correta: number;
		explicacao?: string;
	}[];
	expect(persistidos[0].linhas[0][1]).toBe('B1');
	expect(persistidos[1].alternativas).toEqual(['Primeira', 'Segunda', 'Terceira']);
	expect(persistidos[1].correta).toBe(2);
	expect(persistidos[1].explicacao).toBe('A terceira é a correta.');

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
	await expect(page.getByLabel('Enunciado do exercício', { exact: true })).toHaveCount(0);
	await expect(page.getByText('Qual é a resposta?')).toBeVisible();
});

test('diagrama mermaid atualiza ao vivo sem fechar o editor', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();

	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(`Mermaid E2E ${Date.now()}`);
	await page.getByRole('button', { name: 'Criar' }).click();
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);

	await page.locator('.canvas-adicionar select').selectOption('mermaid');
	await page.getByRole('button', { name: 'Adicionar bloco' }).click();

	const definicao = page.getByLabel('Definição Mermaid');
	const svg = page.locator('.mermaid-conteudo svg');
	await definicao.fill('flowchart LR\n  A[Inicio] --> B[Fim]');

	await expect(svg).toBeVisible();
	await expect(svg).toContainText('Inicio');
	await expect(definicao).toBeFocused();

	await definicao.press('Control+End');
	await page.keyboard.type('\n  B --> C[Meio]');
	await expect(svg).toContainText('Meio');
	await expect(definicao).toBeFocused();

	await definicao.press('Control+End');
	await page.keyboard.type('\n  C --> D[Fim]');
	await expect(svg).toContainText('Fim');
	await expect(svg.locator('g.node')).toHaveCount(4);
	await expect(definicao).toBeFocused();

	const viewport = page.getByRole('region', { name: 'Diagrama Mermaid interativo' });
	const zoom = page.getByLabel('Zoom atual');
	const zoomInicial = await zoom.textContent();

	await viewport.dispatchEvent('wheel', { deltaY: -120 });
	await expect(zoom).toHaveText(zoomInicial ?? '');

	await viewport.dispatchEvent('wheel', { deltaY: -120, ctrlKey: true });
	await expect(zoom).not.toHaveText(zoomInicial ?? '');

	await viewport.dispatchEvent('wheel', { deltaY: 120, ctrlKey: true });
	await expect(zoom).toHaveText(zoomInicial ?? '');
});

test('painel de seções: cria, valida, renomeia, reordena e exclui', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();

	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(`Seções E2E ${Date.now()}`);
	await page.getByRole('button', { name: 'Criar' }).click();
	await expect(page).toHaveURL(/\/apostilas\/\d+/);

	const painel = page.locator('[data-secao]');
	const criar = page.getByRole('button', { name: '+ Criar seção' });
	const campo = page.getByLabel('Nome da nova seção');

	await expect(page.getByText('Nenhuma seção ainda. Crie a primeira abaixo.')).toBeVisible();

	await campo.fill('Bloco 1');
	await criar.click();
	await expect(painel).toHaveCount(1);
	await expect(painel.first()).toContainText('Bloco 1');
	await expect(painel.first()).toContainText('0 aulas');

	await campo.fill('  bloco   2  ');
	await criar.click();
	await expect(painel).toHaveCount(2);
	await expect(painel.nth(1)).toContainText('bloco 2');

	await campo.fill('BLOCO 1');
	await criar.click();
	await expect(page.getByText('Já existe uma seção chamada "BLOCO 1".')).toBeVisible();

	await page.getByRole('button', { name: 'Renomear a seção bloco 2' }).click();
	await page.getByLabel('Nome da seção bloco 2').fill('Bloco 2 — revisado');
	await page
		.locator('form[action="?/renomearSecao"]')
		.getByRole('button', { name: 'Salvar' })
		.click();
	await expect(painel.nth(1)).toContainText('Bloco 2 — revisado');

	await page.getByRole('button', { name: 'Mover a seção Bloco 2 — revisado para cima' }).click();
	await expect(painel.nth(0)).toContainText('Bloco 2 — revisado');
	await expect(painel.nth(1)).toContainText('Bloco 1');

	page.once('dialog', (dialogo) => dialogo.accept());
	await page.getByRole('button', { name: 'Excluir a seção Bloco 1' }).click();
	await expect(painel).toHaveCount(1);
	await expect(painel.first()).toContainText('Bloco 2 — revisado');
});

test('select de seção agrupa a aula e a seção criada no editor é salva', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA);
	await page.getByRole('button', { name: 'Entrar' }).click();

	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(`Agrupamento E2E ${Date.now()}`);
	await page.getByRole('button', { name: 'Criar' }).click();
	const apostilaUrl = new URL(page.url()).pathname;
	await page.getByLabel('Nome da nova seção').fill('Parte 1');
	await page.getByRole('button', { name: '+ Criar seção' }).click();
	await page.getByLabel('Nome da nova seção').fill('Parte 2');
	await page.getByRole('button', { name: '+ Criar seção' }).click();

	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);
	await page.keyboard.type('Aula da parte 2');
	await page.getByLabel('Seção da aula').selectOption({ label: 'Parte 2' });
	await page.getByRole('button', { name: 'Salvar aula' }).click();

	await expect(page).toHaveURL(/\/aulas\/\d+$/);
	await expect(page.locator('.badge', { hasText: 'Parte 2' })).toBeVisible();

	await page.goto(apostilaUrl);
	await expect(page.getByRole('heading', { name: 'Parte 2', level: 2 })).toBeVisible();
	await expect(page.getByText('Aula da parte 2')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Parte 1', level: 2 })).toHaveCount(0);
});

test('trocar tipo de bloco com conteúdo pede confirmação', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA);
	await page.getByRole('button', { name: 'Entrar' }).click();

	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(`Tipo E2E ${Date.now()}`);
	await page.getByRole('button', { name: 'Criar' }).click();
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);

	await page.locator('.canvas-adicionar select').selectOption('texto');
	await page.getByRole('button', { name: 'Adicionar bloco' }).click();

	const texto = page.getByLabel('Texto do bloco');
	await texto.click();
	await page.keyboard.type('conteúdo que será perdido');

	const tipo = page.getByLabel('Tipo do bloco').first();
	page.once('dialog', (dialogo) => dialogo.dismiss());
	await tipo.selectOption('codigo');
	await expect(texto).toHaveText('conteúdo que será perdido');

	page.once('dialog', (dialogo) => dialogo.accept());
	await tipo.selectOption('codigo');
	await expect(page.getByLabel('Código fonte')).toBeVisible();
	await expect(texto).toHaveCount(0);

	await page.locator('.canvas-adicionar select').selectOption('texto');
	await page.getByRole('button', { name: 'Adicionar bloco' }).click();
	const vazio = page.getByLabel('Texto do bloco').last();
	let perguntou = false;
	page.on('dialog', (dialogo) => {
		perguntou = true;
		void dialogo.dismiss();
	});
	await page.getByLabel('Tipo do bloco').last().selectOption('formula');
	await expect(page.getByLabel('Definição LaTeX')).toBeVisible();
	expect(perguntou).toBe(false);
	await expect(vazio).toHaveCount(0);
});
