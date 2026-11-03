import { test, expect, type Page } from '@playwright/test';
import { SENHA_E2E } from './ambiente';

const CARTOES_AULAS = 'section[data-arrasto-lista] ul > li';

async function entrar(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();
}

async function importarExemplo(page: Page) {
	await page.goto('/importar');
	// A aba já nasce com o exemplo no textarea e a prévia no ar.
	await expect(page.getByText('2 seção(ões) · 3 aula(s) · 17 bloco(s)')).toBeVisible();
	await page.getByRole('button', { name: 'Criar conteúdo' }).click();
	await expect(page).toHaveURL(/\/apostilas\/\d+$/);
	return page.url();
}

// No painel logado o título da apostila é um `TextoEditavel` com
// `aria-label="Título da apostila"` — o h1 por papel, não por nome acessível.
function tituloApostila(page: Page) {
	return page.getByRole('heading', { level: 1, name: 'Título da apostila' });
}

test('a prévia valida o exemplo e a importação cria a apostila com as aulas e o link resolvido', async ({
	page
}) => {
	await entrar(page);
	await page.goto('/importar');

	// Prêvia: título, tipo e contagens; nenhum bloco pendente no exemplo.
	const preview = page.locator('section.card').filter({ has: page.getByRole('heading', { name: 'Matemática — Revisão' }) });
	await expect(page.getByRole('heading', { name: 'Matemática — Revisão' })).toBeVisible();
	await expect(preview.locator('span.badge')).toHaveText('Apostila');
	await expect(page.getByText('2 seção(ões) · 3 aula(s) · 17 bloco(s)')).toBeVisible();

	// Cria a apostila importada.
	await page.getByRole('button', { name: 'Criar conteúdo' }).click();
	await expect(page).toHaveURL(/\/apostilas\/\d+$/);
	const apostilaId = new URL(page.url()).pathname.split('/')[2];

	// Painel: as 3 aulas aparecem (2 seções com as aulas dentro).
	await expect(tituloApostila(page)).toContainText('Matemática — Revisão');
	await expect(page.locator(CARTOES_AULAS)).toHaveCount(3);
	for (const titulo of ['Função afim', 'Gráfico da função afim', 'Área do triângulo']) {
		await expect(
			page.locator(CARTOES_AULAS).filter({ has: page.getByText(titulo, { exact: true }) })
		).toBeVisible();
	}

	// O link "Ir para a função afim" (alvoTitulo no JSON) virou uma rota real de aula.
	const cardArea = page.locator(CARTOES_AULAS).filter({ hasText: 'Área do triângulo' });
	await cardArea.getByRole('link', { name: 'Abrir' }).click();
	await expect(page).toHaveURL(new RegExp(`/apostilas/${apostilaId}/aulas/\\d+$`));
	const href = await page.getByRole('link', { name: 'Ir para a função afim' }).getAttribute('href');
	expect(href).toMatch(new RegExp(`^/apostilas/${apostilaId}/aulas/\\d+$`));
});

test('importa apostila com aula solta e avisa o bloco vazio mas mantém a criação', async ({ page }) => {
	await entrar(page);
	const token = `Solto${Date.now()}`;
	const json = JSON.stringify({
		conteudo: 'apostila',
		titulo: `${token} — sem seções`,
		descricao: '',
		aulas: [
			{
				titulo: `${token} aula única`,
				descricao: '',
				blocos: [
					{ tipo: 'titulo', texto: 'Começo', nivel: 1 },
					{ tipo: 'texto', conteudo: '   ' }
				]
			}
		]
	});

	await page.goto('/importar');
	const textarea = page.getByLabel('JSON do conteúdo');
	await textarea.fill(json);

	// A prévia aponta o texto vazio como pendente — aviso, não bloqueio.
	await expect(page.getByText('Bloco 2 (Texto): texto vazio')).toBeVisible();
	await expect(page.getByText('0 seção(ões) · 1 aula(s) · 2 bloco(s)')).toBeVisible();

	await page.getByRole('button', { name: 'Criar conteúdo' }).click();
	await expect(page).toHaveURL(/\/apostilas\/\d+$/);
	await expect(tituloApostila(page)).toContainText(`${token} — sem seções`);
	// A aula solta ficou sem seção e o bloco vazio foi mantido (entra em leitura).
	await expect(page.locator(CARTOES_AULAS).filter({ hasText: `${token} aula única` })).toBeVisible();
});

test('exporta o que já existe de volta para o editor (round-trip)', async ({ page }) => {
	await entrar(page);
	await importarExemplo(page);

	await page.goto('/importar');
	// Os testes dividem o mesmo DB; a lista de apostilas tem várias. Pegamos a
	// primeira "Matemática — Revisão" — o round-trip não depende de qual é.
	await page
		.getByLabel('Conteúdo', { exact: true })
		.selectOption(await page.locator('option', { hasText: 'Matemática — Revisão' }).first().elementHandle());
	await page.getByRole('button', { name: 'Carregar no editor' }).click();

	// O JSON exportado volta no formato do importar, com o link de aula por título.
	const textarea = page.getByLabel('JSON do conteúdo');
	await expect(textarea).toHaveValue(/"conteudo": "apostila"/);
	await expect(textarea).toHaveValue(/"titulo": "Matemática — Revisão"/);
	await expect(textarea).toHaveValue(/"alvoTitulo": "Função afim"/);
	await expect(textarea).not.toHaveValue(/"alvoId"/);
	// Aparência do link é cosmética, mas viaja junto no round-trip.
	await expect(textarea).toHaveValue(/"tamanho": "grande"/);
	await expect(textarea).toHaveValue(/"largura": "full"/);
	await expect(textarea).toHaveValue(/"posicao": "centro"/);

	// E a prévia confirma: dá para reimportar o que foi exportado.
	await expect(page.getByRole('heading', { name: 'Matemática — Revisão' })).toBeVisible();
	await expect(page.getByText('2 seção(ões) · 3 aula(s) · 17 bloco(s)')).toBeVisible();

	// Reimportar volta a criar (sempre nova) e recai no painel da nova.
	await page.getByRole('button', { name: 'Criar conteúdo' }).click();
	await expect(page).toHaveURL(/\/apostilas\/\d+$/);
	await expect(tituloApostila(page)).toContainText('Matemática — Revisão');
});

test('abre o exemplo de cada tipo no popup, copia e coloca no editor', async ({ page }) => {
	await entrar(page);
	await page.goto('/importar');

	const exemplos: Array<[string, string, RegExp]> = [
		['Exemplo: Apostila', '"conteudo": "apostila"', /Matemática — Revisão/],
		['Exemplo: Anexo', '"conteudo": "anexo"', /Manual de fórmulas/],
		['Exemplo: Atividade', '"conteudo": "exercicio"', /Avaliação — Função afim/],
		['Exemplo: Quiz', '"conteudo": "quiz"', /Quiz — Revisão de Funções/]
	];

	for (const [botao, conteudo, titulo] of exemplos) {
		await page.getByRole('button', { name: botao }).click();

		const modal = page.locator('.modal-box');
		await expect(modal).toBeVisible();
		await expect(modal.getByRole('heading', { level: 2 })).toHaveText(
			`Exemplo de ${botao.split(': ')[1].toLowerCase()}`
		);
		await expect(modal.locator('pre')).toContainText(titulo);

		// Copiar dá feedback no próprio botão.
		await page.getByRole('button', { name: 'Copiar' }).click();
		await expect(page.getByRole('button', { name: 'Copiado!' })).toBeVisible();

		// "Usar no editor" fecha o popup e preenche o textarea com o exemplo.
		await page.getByRole('button', { name: 'Usar no editor' }).click();
		await expect(page.locator('.modal-box')).toHaveCount(0);
		await expect(page.getByLabel('JSON do conteúdo')).toHaveValue(new RegExp(conteudo));
		await expect(page.getByRole('heading', { name: titulo })).toBeVisible();

		// A prévia de nenhum dos exemplos aponta pendência (alert vazio no card).
		const preview = page.locator('section.card').filter({ has: page.getByRole('heading', { name: titulo }) });
		await expect(preview.locator('.alert')).toHaveCount(0);
	}
});
// --- Importação/exportação de UMA aula (textarea no editor da aula) ----------

async function abrirEditorAula(page: Page, titulo: string) {
	await expect(tituloApostila(page)).toBeVisible();
	const card = page.locator(CARTOES_AULAS).filter({ has: page.getByText(titulo, { exact: true }) });
	await card.getByRole('link', { name: 'Abrir' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);
	await page.getByRole('link', { name: 'Editar' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+\/editar$/);
}

const JSON_AULA_REPOSTA = JSON.stringify({
	conteudo: 'aula',
	titulo: 'Aula reposta E2E',
	descricao: 'Substituída via JSON',
	blocos: [
		{ tipo: 'titulo', texto: 'Novo começo', nivel: 1 },
		{ tipo: 'texto', conteudo: 'Conteúdo importado no editor da aula.' },
		{ tipo: 'link', rotulo: 'Ver área', tipoLink: 'aula', alvoTitulo: 'Área do triângulo' }
	]
});

test('exporta a aula no editor, importa com confirmação e sobrescreve o conteúdo', async ({
	page
}) => {
	await entrar(page);
	await importarExemplo(page);
	await abrirEditorAula(page, 'Função afim');

	// A seção de JSON fica no <details> do fim do editor.
	await page.getByText('Importar / exportar por JSON').click();
	const textarea = page.getByLabel('JSON da aula');

	// Exportar joga a aula atual (mesmo formato do /importar) no textarea.
	await page.getByRole('button', { name: 'Exportar aula atual' }).click();
	await expect(textarea).toHaveValue(/"conteudo": "aula"/);
	await expect(textarea).toHaveValue(/"titulo": "Função afim"/);
	await expect(textarea).toHaveValue(/"tipo": "exercicio"/);

	// Colar outro JSON atualiza a prévia e o botão de importar fica pronto.
	await textarea.fill(JSON_AULA_REPOSTA);
	await expect(page.getByText('3 bloco(s) — "Aula reposta E2E"')).toBeVisible();

	// Importar pede confirmação e substitui o conteúdo do editor.
	page.once('dialog', (dialogo) => {
		expect(dialogo.message()).toContain('substitui o título, a descrição e todos os blocos');
		void dialogo.accept();
	});
	await page.getByRole('button', { name: 'Importar e substituir' }).click();
	await expect(page.getByText('Aula substituída no editor. Clique em "Salvar aula" para gravar.')).toBeVisible();

	// Salvar grava de verdade: a leitura pública mostra o conteúdo novo e o
	// link interno (alvoTitulo) resolve para a rota da outra aula da apostila.
	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Aula reposta E2E' })).toBeVisible();
	await expect(page.getByText('Conteúdo importado no editor da aula.')).toBeVisible();
	const href = await page.getByRole('link', { name: 'Ver área' }).getAttribute('href');
	expect(href).toMatch(/^\/apostilas\/\d+\/aulas\/\d+$/);
});

test('cancelar a confirmação mantém o conteúdo da aula', async ({ page }) => {
	await entrar(page);
	await importarExemplo(page);
	await abrirEditorAula(page, 'Gráfico da função afim');

	await page.getByText('Importar / exportar por JSON').click();
	await page.getByLabel('JSON da aula').fill(JSON_AULA_REPOSTA);

	page.once('dialog', (dialogo) => void dialogo.dismiss());
	await page.getByRole('button', { name: 'Importar e substituir' }).click();

	// Sem o alerta de sucesso e o título/canvas originais intactos.
	await expect(page.getByText('Aula substituída no editor')).toHaveCount(0);
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Gráfico da função afim');
	await expect(page.getByText('Novo começo')).toHaveCount(0);
});

test('link interno que não resolve bloqueia a importação da aula', async ({ page }) => {
	await entrar(page);
	await importarExemplo(page);
	await abrirEditorAula(page, 'Função afim');

	await page.getByText('Importar / exportar por JSON').click();
	await page
		.getByLabel('JSON da aula')
		.fill(
			JSON.stringify({
				conteudo: 'aula',
				titulo: 'Não vai',
				blocos: [{ tipo: 'link', rotulo: 'Quebrado', tipoLink: 'aula', alvoTitulo: 'Nunca existiu' }]
			})
		);

	await expect(page.getByText(/Não achei a aula "Nunca existiu"/)).toBeVisible();
	await expect(page.getByRole('button', { name: 'Importar e substituir' })).toBeDisabled();
});
