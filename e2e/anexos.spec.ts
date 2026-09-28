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
	return new URL(page.url()).pathname;
}

async function criarAula(page: Page, titulo: string) {
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);
	await page.getByLabel('Título da aula').fill(titulo);
	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);
	return new URL(page.url()).pathname;
}

// Anexo é solto: nasce em /anexos, sem escolher apostila.
async function criarAnexo(page: Page, titulo: string) {
	await page.goto('/anexos');
	await page.getByRole('button', { name: '+ Novo anexo' }).click();
	await expect(page).toHaveURL(/\/anexos\/\d+\/editar/);
	await page.getByLabel('Título do anexo').fill(titulo);
	return new URL(page.url()).pathname.replace(/\/editar$/, '');
}

async function linkarAnexo(page: Page, rotulo: string, tituloAnexo: string) {
	await page.getByRole('button', { name: 'Link', exact: true }).click();
	await page.getByLabel('Texto do link').fill(rotulo);
	await page.getByLabel('Tipo', { exact: true }).selectOption('anexo');
	const busca = page.getByLabel('Buscar anexo');
	await busca.click();
	await busca.fill(tituloAnexo);
	await page.getByRole('button', { name: new RegExp(tituloAnexo) }).click();
}

test('cria anexo pelo menu, edita e salva conteúdo', async ({ page }) => {
	await entrar(page);

	await page.getByRole('link', { name: 'Anexos' }).click();
	await expect(page.getByRole('heading', { name: 'Anexos', level: 1 })).toBeVisible();
	await expect(page.getByText('Nenhum anexo ainda.', { exact: false })).toBeVisible();
	// Nenhuma apostila é exigida para criar o anexo.
	await expect(page.getByLabel('Apostila', { exact: true })).toHaveCount(0);

	await page.getByRole('button', { name: '+ Novo anexo' }).click();
	await expect(page).toHaveURL(/\/anexos\/\d+\/editar/);
	const titulo = page.getByLabel('Título do anexo');
	await expect(titulo).toBeFocused();
	await page.keyboard.type('Slides da semana 1');
	await page.getByRole('button', { name: 'Texto', exact: true }).click();
	await page.getByLabel('Texto do bloco').click();
	await page.keyboard.type('Material de apoio da semana 1.');

	await page.getByRole('button', { name: 'Salvar anexo' }).click();
	await expect(page).toHaveURL(/\/anexos\/\d+$/);
	await expect(page.getByRole('heading', { name: 'Slides da semana 1', level: 1 })).toBeVisible();
	await expect(page.getByText('Material de apoio da semana 1.')).toBeVisible();

	await page.goto('/anexos');
	await expect(page.getByText('Slides da semana 1')).toBeVisible();
	await expect(page.getByText('Sem uso', { exact: true })).toBeVisible();
});

test('anexo solto não aparece na lista de aulas nem na contagem do índice', async ({ page }) => {
	await entrar(page);
	const apostila = `Anexo invisível ${Date.now()}`;
	const caminho = await criarApostila(page, apostila);
	await criarAula(page, 'Aula listada');
	await criarAnexo(page, 'Anexo escondido');
	await page.getByRole('button', { name: 'Salvar anexo' }).click();
	await expect(page).toHaveURL(/\/anexos\/\d+$/);

	await page.goto(caminho);
	await expect(page.getByText('Aula listada')).toBeVisible();
	await expect(page.getByText('Anexo escondido')).toHaveCount(0);

	await page.goto('/');
	const cartao = page.getByRole('link', { name: new RegExp(apostila) });
	await expect(cartao).toContainText('1 aula');
	await expect(cartao).not.toContainText('2 aulas');
});

test('link de anexo leva o aluno até o anexo, que fica fora da lista', async ({ page }) => {
	await entrar(page);
	const apostila = `Anexo linkado ${Date.now()}`;
	const caminho = await criarApostila(page, apostila);

	const tituloAnexo = `Apêndice ${Date.now()}`;
	const caminhoAnexo = await criarAnexo(page, tituloAnexo);
	await page.getByRole('button', { name: 'Salvar anexo' }).click();
	await expect(page).toHaveURL(/\/anexos\/\d+$/);

	await page.goto(caminho);
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);
	await page.getByLabel('Título da aula').fill('Aula com anexo');
	await linkarAnexo(page, 'Abrir apêndice', tituloAnexo);
	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);
	const caminhoAula = new URL(page.url()).pathname;
	await expect(page.getByRole('link', { name: /Abrir apêndice/ })).toHaveAttribute(
		'href',
		caminhoAnexo
	);

	await page.getByRole('button', { name: 'Sair' }).click();
	await expect(page).toHaveURL(/\/$/);

	await page.goto(caminhoAula);
	await expect(page.getByRole('heading', { name: 'Aula com anexo', level: 1 })).toBeVisible();
	await expect(page.getByRole('link', { name: /Abrir apêndice/ })).toBeVisible();
	await page.getByRole('link', { name: /Abrir apêndice/ }).click();
	await expect(page).toHaveURL(new RegExp(caminhoAnexo));
	await expect(page.getByRole('heading', { name: tituloAnexo, level: 1 })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Editar', exact: true })).toHaveCount(0);
});

test('anexo criado fora de qualquer apostila vale em todas e mostra links reversos', async ({ page }) => {
	await entrar(page);
	const primeira = `Doadora do anexo ${Date.now()}`;
	const segunda = `Receptora ${Date.now()}`;
	const caminhoSegunda = await criarApostila(page, segunda);
	await criarApostila(page, primeira);

	const tituloAnexo = `Material comum ${Date.now()}`;
	const caminhoAnexo = await criarAnexo(page, tituloAnexo);
	await page.getByRole('button', { name: 'Salvar anexo' }).click();
	await expect(page).toHaveURL(/\/anexos\/\d+$/);

	// O mesmo anexo, criado sem vincular a apostila "Doadora", entra numa aula da "Receptora".
	await page.goto(caminhoSegunda);
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);
	await page.getByLabel('Título da aula').fill('Aula que empresta o material');
	await linkarAnexo(page, 'Material da outra apostila', tituloAnexo);
	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);
	await expect(page.getByRole('link', { name: /Material da outra apostila/ })).toHaveAttribute(
		'href',
		caminhoAnexo
	);

	await page.goto('/anexos');
	// Nenhuma apostila dona do anexo: os links reversos apontam direto para as aulas.
	await expect(page.getByRole('link', { name: primeira, exact: true })).toHaveCount(0);
	const cartao = page.locator('li', { hasText: tituloAnexo }).first();
	await expect(cartao).toContainText('Usado em 1 aula');
	await expect(cartao.getByRole('link', { name: 'Aula que empresta o material' })).toBeVisible();
	await expect(cartao.getByRole('button', { name: 'Excluir' })).toBeDisabled();
});

test('anexo linkado duas vezes na mesma aula conta uma só referência', async ({ page }) => {
	await entrar(page);
	const apostila = `Anexo duplicado ${Date.now()}`;
	const caminho = await criarApostila(page, apostila);

	const tituloAnexo = `Material único ${Date.now()}`;
	await criarAnexo(page, tituloAnexo);
	await page.getByRole('button', { name: 'Salvar anexo' }).click();
	await expect(page).toHaveURL(/\/anexos\/\d+$/);

	await page.goto(caminho);
	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);
	await page.getByLabel('Título da aula').fill('Aula com dois links');
	await linkarAnexo(page, 'Primeiro acesso', tituloAnexo);
	await linkarAnexo(page, 'Segundo acesso', tituloAnexo);
	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);

	await page.goto('/anexos');
	const cartao = page.locator('li', { hasText: tituloAnexo }).first();
	await expect(cartao).toContainText('Usado em 1 aula');
	await expect(cartao.getByRole('link', { name: 'Aula com dois links' })).toBeVisible();
	await expect(cartao.getByRole('button', { name: 'Excluir' })).toBeDisabled();

	// A UI bloqueia, mas a action precisa recusar também: link órfão quebraria a aula.
	const href = await cartao.getByRole('link', { name: tituloAnexo }).getAttribute('href');
	const anexoId = new URL(href ?? '', page.url()).pathname.split('/').pop() ?? '';
	const resposta = await page.request.post('/anexos?/excluir', {
		form: { anexoId },
		headers: { accept: 'text/html', origin: new URL(page.url()).origin }
	});
	expect(resposta.status()).toBe(409);
	await page.reload();
	await expect(page.locator('li', { hasText: tituloAnexo }).first()).toBeVisible();
});

test('anexo linka para outro anexo, sem passar por apostila', async ({ page }) => {
	await entrar(page);

	const tituloAnexo = `Hub ${Date.now()}`;
	const caminhoAnexo = await criarAnexo(page, tituloAnexo);
	await page.getByRole('button', { name: 'Salvar anexo' }).click();
	await expect(page).toHaveURL(new RegExp(`${caminhoAnexo}$`));

	// O picker do anexo oferece os outros anexos, sem depender de apostila.
	const tituloInterno = `Detalhe do hub ${Date.now()}`;
	const caminhoInterno = await criarAnexo(page, tituloInterno);
	await linkarAnexo(page, 'Ver detalhe', tituloAnexo);
	await page.getByRole('button', { name: 'Salvar anexo' }).click();
	await expect(page).toHaveURL(new RegExp(`${caminhoInterno}$`));
	await expect(page.getByRole('link', { name: /Ver detalhe/ })).toHaveAttribute(
		'href',
		caminhoAnexo
	);

	await page.goto(`${caminhoAnexo}/editar`);
	await linkarAnexo(page, 'Apontar para o detalhe', tituloInterno);
	await page.getByRole('button', { name: 'Salvar anexo' }).click();
	await expect(page).toHaveURL(new RegExp(`${caminhoAnexo}$`));
	await expect(page.getByRole('link', { name: /Apontar para o detalhe/ })).toHaveAttribute(
		'href',
		caminhoInterno
	);
});

test('imprimir e apresentar abrem o anexo', async ({ page }) => {
	await entrar(page);

	await page.getByRole('link', { name: 'Anexos' }).click();
	await page.getByRole('button', { name: '+ Novo anexo' }).click();
	await page.getByLabel('Título do anexo').fill('Slides do anexo');
	await page.getByRole('button', { name: 'Texto', exact: true }).click();
	await page.getByLabel('Texto do bloco').click();
	await page.keyboard.type('Primeiro slide do anexo.');
	await page.getByRole('button', { name: 'Salvar anexo' }).click();
	await expect(page).toHaveURL(/\/anexos\/\d+$/);

	const impressao = page.waitForEvent('popup');
	await page.getByRole('link', { name: 'Imprimir/PDF' }).click();
	const paginaImpressao = await impressao;
	await expect(paginaImpressao.getByRole('heading', { name: 'Slides do anexo', level: 1 })).toBeVisible();
	await expect(paginaImpressao.getByText('Primeiro slide do anexo.')).toBeVisible();
	await expect(paginaImpressao.getByRole('button', { name: 'Imprimir / salvar PDF' })).toBeVisible();
	await paginaImpressao.close();

	await page.getByRole('link', { name: 'Apresentar' }).click();
	await expect(page.getByText('Primeiro slide do anexo.')).toBeVisible();
	await expect(page.getByText('1 / 1')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page).toHaveURL(/\/anexos\/\d+$/);
});

test('anexo sem uso pode ser excluído e some do banco', async ({ page }) => {
	await entrar(page);

	const caminhoAnexo = await criarAnexo(page, 'Vai sumir');
	await page.getByRole('button', { name: 'Salvar anexo' }).click();
	await expect(page).toHaveURL(/\/anexos\/\d+$/);

	page.once('dialog', (dialogo) => dialogo.accept());
	await page.goto('/anexos');
	const cartao = page.locator('li', { hasText: 'Vai sumir' }).first();
	await cartao.getByRole('button', { name: 'Excluir' }).click();
	await expect(cartao).toHaveCount(0);

	await page.goto(caminhoAnexo);
	await expect(page.getByText('404')).toBeVisible();
});
