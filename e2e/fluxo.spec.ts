import { test, expect } from '@playwright/test';
import { SENHA_E2E } from './ambiente';

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
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
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
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
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
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
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

test('botões de nível trocam o heading do título e o nível persiste', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();

	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(`Níveis E2E ${Date.now()}`);
	await page.getByRole('button', { name: 'Criar' }).click();
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);

	await page.getByRole('button', { name: 'Título', exact: true }).click();
	const blocoTitulo = page.locator('[data-canvas-block]').first();
	await blocoTitulo.getByLabel('Editar título', { exact: true }).click();
	await page.keyboard.type('Seção do capítulo');

	const niveis = blocoTitulo.getByRole('group', { name: 'Nível do título' });
	await expect(niveis.getByRole('button')).toHaveText(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
	// Rótulo curto pede explicação: o tooltip da lib vem do `data-tip` ("Título 1"…),
	// que não entra no nome acessível — o do botão continua sendo o H visível.
	await expect
		.poll(() =>
			niveis
				.getByRole('button')
				.evaluateAll((botoes) => botoes.map((botao) => botao.getAttribute('data-tip')))
		)
		.toEqual(['Título 1', 'Título 2', 'Título 3', 'Título 4', 'Título 5', 'Título 6']);
	// Bloco novo já nasce no topo da hierarquia.
	await expect(niveis.getByRole('button', { name: 'H1' })).toHaveAttribute('aria-pressed', 'true');

	// H4 é o quarto botão: o valor é numérico, não a ordem do rótulo.
	await niveis.getByRole('button', { name: 'H4' }).click();
	await expect(niveis.getByRole('button', { name: 'H4' })).toHaveAttribute('aria-pressed', 'true');
	await expect(niveis.getByRole('button', { name: 'H1' })).toHaveAttribute('aria-pressed', 'false');

	// A tag real acompanha o nível escolhido. No canvas não dá para casar pelo
	// nome acessível: o `aria-label` do editor ("Editar título") tem precedência
	// sobre o texto, então a checagem é pela tag.
	await expect(blocoTitulo.locator('h4')).toHaveText('Seção do capítulo');

	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);
	await expect(page.getByRole('heading', { name: 'Seção do capítulo', level: 4 })).toBeVisible();

	await page.getByRole('link', { name: 'Editar', exact: true }).click();
	await expect(page).toHaveURL(/\/editar/);
	const persistidos = JSON.parse(await page.locator('input[name="blocos"]').inputValue()) as {
		tipo: string;
		nivel: number;
	}[];
	expect(persistidos[0].tipo).toBe('titulo');
	expect(persistidos[0].nivel).toBe(4);

	// A camada de configuração só existe com o bloco selecionado.
	const blocoEditado = page.locator('[data-canvas-block]').first();
	await blocoEditado.locator('h4').click();
	await expect(
		blocoEditado
			.getByRole('group', { name: 'Nível do título' })
			.getByRole('button', { name: 'H4' })
	).toHaveAttribute('aria-pressed', 'true');
});

test('canvas edita tabela e exercício e mantém os dados', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();

	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(`Canvas E2E ${Date.now()}`);
	await page.getByRole('button', { name: 'Criar' }).click();
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);

	const adicionar = (tipo: string) => page.getByRole('button', { name: tipo, exact: true }).click();

	await adicionar('Tabela');
	await page.getByPlaceholder('Coluna').fill('Entrada');
	await page.getByPlaceholder('Valor').fill('A1');
	await page.getByRole('button', { name: '+ Linha' }).click();
	await page.getByRole('button', { name: '+ Coluna' }).click();
	await page.getByPlaceholder('Coluna').nth(1).fill('Saída');
	await page.getByPlaceholder('Valor').nth(1).fill('B1');

	await adicionar('Exercício');
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
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();

	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(`Mermaid E2E ${Date.now()}`);
	await page.getByRole('button', { name: 'Criar' }).click();
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);

	await page.getByRole('button', { name: 'Diagrama', exact: true }).click();

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

test('tema do diagrama mermaid fica ao lado do rótulo e é salvo', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();

	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(`Mermaid tema ${Date.now()}`);
	await page.getByRole('button', { name: 'Criar' }).click();
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);

	await page.getByRole('button', { name: 'Diagrama', exact: true }).click();

	const tema = page.getByLabel('Tema do diagrama Mermaid');
	const rotulo = page.getByText('Definição Mermaid');
	const definicao = page.getByLabel('Definição Mermaid');
	const svg = page.locator('.mermaid-conteudo svg');
	await expect(tema).toHaveValue('neutral');

	// Select na mesma linha do rótulo, encostado na direita (alinhado ao textarea).
	const centro = (caixa: { y: number; height: number }) => caixa.y + caixa.height / 2;
	const caixaRotulo = (await rotulo.boundingBox())!;
	const caixaTema = (await tema.boundingBox())!;
	const caixaDefinicao = (await definicao.boundingBox())!;
	expect(Math.abs(centro(caixaTema) - centro(caixaRotulo))).toBeLessThan(14);
	expect(caixaTema.x).toBeGreaterThan(caixaRotulo.x + caixaRotulo.width);
	expect(Math.abs(caixaTema.x + caixaTema.width - (caixaDefinicao.x + caixaDefinicao.width))).toBeLessThan(
		2
	);

	await expect(svg).toBeVisible();
	const estiloNeutro = await page.locator('.mermaid-conteudo').innerHTML();

	await tema.selectOption('forest');
	await expect
		.poll(async () => (await page.locator('.mermaid-conteudo').innerHTML()) !== estiloNeutro)
		.toBe(true);
	await expect(svg).toContainText('flowchart');

	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);
	await expect(page.getByLabel('Tema do diagrama Mermaid', { exact: true })).toHaveCount(0);

	await page.goto(`${new URL(page.url()).pathname}/editar`);
	await page.getByRole('group', { name: 'Prévia do bloco mermaid' }).click();
	await expect(page.getByLabel('Tema do diagrama Mermaid')).toHaveValue('forest');
});

test('painel de seções: cria, valida, renomeia, reordena e exclui', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
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

	await page.getByRole('button', { name: 'Mover a seção Bloco 2 — revisado' }).press('ArrowUp');
	await expect(painel.nth(0)).toContainText('Bloco 2 — revisado');
	await expect(painel.nth(1)).toContainText('Bloco 1');

	page.once('dialog', (dialogo) => dialogo.accept());
	await page.getByRole('button', { name: 'Excluir a seção Bloco 1' }).click();
	await expect(painel).toHaveCount(1);
	await expect(painel.first()).toContainText('Bloco 2 — revisado');
});

test('select de seção agrupa a aula e a seção criada no editor é salva', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();

	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(`Agrupamento E2E ${Date.now()}`);
	await page.getByRole('button', { name: 'Criar' }).click();
	await expect(page).toHaveURL(/\/apostilas\/\d+/);
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
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();

	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(`Tipo E2E ${Date.now()}`);
	await page.getByRole('button', { name: 'Criar' }).click();
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);

	await page.getByRole('button', { name: 'Texto', exact: true }).click();

	const texto = page.getByLabel('Texto do bloco');
	await texto.click();
	await page.keyboard.type('conteúdo que será perdido');

	const tipo = page.getByLabel('Tipo do bloco').first();
	page.once('dialog', (dialogo) => dialogo.dismiss());
	await tipo.selectOption('codigo');
	// Diálogo recusado: o bloco continua editando e o markdown segue intacto.
	await expect(texto).toHaveValue('conteúdo que será perdido');
	// Esc sai da edição e devolve a leitura formatada, que é o que o aluno leria.
	await texto.press('Escape');
	await expect(page.getByLabel('Editar texto')).toContainText('conteúdo que será perdido');
	await page.getByLabel('Editar texto').click();
	await expect(texto).toHaveValue('conteúdo que será perdido');

	page.once('dialog', (dialogo) => dialogo.accept());
	await tipo.selectOption('codigo');
	await expect(page.getByLabel('Código fonte')).toBeVisible();
	await expect(texto).toHaveCount(0);

	await page.getByRole('button', { name: 'Texto', exact: true }).click();
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

test('grid de criação adiciona o bloco escolhido logo abaixo do selecionado', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();

	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill(`Grid E2E ${Date.now()}`);
	await page.getByRole('button', { name: 'Criar' }).click();
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);

	const grade = page.getByRole('group', { name: 'Adicionar bloco' });
	await expect(grade.getByRole('button')).toHaveCount(12);
	await expect(page.getByLabel('Tipo do novo bloco')).toHaveCount(0);

	const posicoes = async () =>
		page
			.getByRole('button', { name: /Mover bloco \d/ })
			.evaluateAll((botoes) => botoes.map((botao) => botao.getAttribute('aria-label')));

	const primeiro = page.getByLabel('Editar título').first();
	await page.getByRole('button', { name: 'Título', exact: true }).click();
	await primeiro.click();
	await page.keyboard.type('Primeiro');
	await page.getByRole('button', { name: 'Tabela', exact: true }).click();
	await expect(posicoes()).resolves.toEqual([
		'Mover bloco 1: Título',
		'Mover bloco 2: Tabela'
	]);

	// Com o primeiro bloco selecionado, o novo entra entre ele e o que já vinha depois.
	await primeiro.click();
	await page.getByRole('button', { name: 'Código', exact: true }).click();
	await expect(posicoes()).resolves.toEqual([
		'Mover bloco 1: Título',
		'Mover bloco 2: Código',
		'Mover bloco 3: Tabela'
	]);
});
