import { test, expect, type Page } from '@playwright/test';
import { SENHA_E2E } from './ambiente';

async function entrar(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();
}

async function sair(page: Page) {
	await page.context().clearCookies();
}

// Atividade nasce solta em /exercicios e é montada com blocos de exercício.
async function criarAtividade(page: Page, titulo: string) {
	await page.goto('/exercicios');
	await page.getByRole('button', { name: '+ Nova atividade' }).click();
	await expect(page).toHaveURL(/\/exercicios\/\d+\/editar/);
	await page.getByLabel('Título da atividade').fill(titulo);
	return new URL(page.url()).pathname.replace(/\/editar$/, '');
}

// O bloco novo entra no fim, então o último é o que acabou de ser criado.
// Ele nasce com 2 alternativas, então as extras precisam ser adicionadas.
async function questao(
	page: Page,
	{
		enunciado,
		alternativas,
		correta,
		selecao
	}: {
		enunciado: string;
		alternativas: string[];
		/** letras da(s) alternativa(s) verdadeira(s) */
		correta: string | string[];
		selecao?: 'radio' | 'checkbox';
	}
) {
	await page.getByRole('button', { name: 'Exercício', exact: true }).click();
	if (selecao) await page.getByLabel('Tipo de resposta').last().selectOption(selecao);
	await page.getByLabel('Enunciado do exercício').last().click();
	await page.keyboard.type(enunciado);
	for (let indice = 2; indice < alternativas.length; indice += 1) {
		await page.getByRole('button', { name: '+ Alternativa' }).last().click();
	}
	for (const [indice, texto] of alternativas.entries()) {
		const letra = String.fromCharCode(65 + indice);
		// `exact` evita casar com o botão "Remover alternativa A".
		await page.getByLabel(`Alternativa ${letra}`, { exact: true }).last().click();
		await page.keyboard.type(texto);
	}
	for (const letra of Array.isArray(correta) ? correta : [correta]) {
		await page.getByLabel(`Marcar alternativa ${letra} como correta`).last().click();
	}
}

async function dissertativa(page: Page, pergunta: string, orientacao?: string) {
	await page.getByRole('button', { name: 'Dissertativa', exact: true }).click();
	await page.getByLabel('Pergunta da atividade').last().click();
	await page.keyboard.type(pergunta);
	if (orientacao) {
		await page.getByLabel('Orientação', { exact: true }).last().click();
		await page.keyboard.type(orientacao);
	}
}

test('cria atividade, responde sem login e confere o resultado com chave', async ({ page }) => {
	await entrar(page);

	const caminho = await criarAtividade(page, `Revisão ${Date.now()}`);
	await questao(page, {
		enunciado: 'Quanto é 2 + 2?',
		alternativas: ['3', '4', '5'],
		correta: 'B'
	});
	await questao(page, {
		enunciado: 'Qual destes é um número primo?',
		alternativas: ['4', '6', '7'],
		correta: 'C'
	});

	await page.getByRole('button', { name: 'Salvar atividade' }).click();
	await expect(page).toHaveURL(new RegExp(`${caminho}$`));
	await expect(page.getByText('Questão 1')).toBeVisible();
	await expect(page.getByText('Questão 2')).toBeVisible();
	await expect(page.getByLabel('Seu nome')).toBeVisible();

	// Gabarito não pode vazar no HTML público: nem no texto, nem no payload do SSR.
	const html = await page.content();
	expect(html).not.toContain('correta');
	expect(html).not.toContain('explicacao');

	// A mesma página responde depois de sair da sessão.
	await sair(page);
	await page.goto(caminho);
	await expect(page.getByLabel('Seu nome')).toBeVisible();

	await page.getByLabel('Seu nome').fill('Ana Souza');
	await page.getByLabel('Alternativa A', { exact: true }).first().check();
	await page.getByLabel('Alternativa C', { exact: true }).nth(1).check();
	await page.getByRole('button', { name: 'Enviar respostas' }).click();

	await expect(page.getByText('1/2 acertos')).toBeVisible();
	await expect(page.getByText('Incorreto — resposta certa: B')).toBeVisible();
	await expect(page.getByText('Correto!')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Baixar imagem' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Imprimir / PDF' })).toBeVisible();

	// A chave registra aluno, atividade, nota e gabarito assinado.
	const chave = (await page.locator('p.font-mono').first().innerText()).replace(/\s+/g, '');
	const partes = chave.split('.');
	expect(partes).toHaveLength(2);
	const dados = JSON.parse(Buffer.from(partes[0], 'base64url').toString('utf8'));
	expect(dados).toMatchObject({
		v: 1,
		nome: 'Ana Souza',
		acertos: 1,
		total: 2,
		gabarito: expect.any(String)
	});
	expect(dados.exercicio).toBe(Number(caminho.split('/').pop()));
});

test('exige o nome do aluno e não guarda gabarito no formulário', async ({ page }) => {
	await entrar(page);

	const caminho = await criarAtividade(page, `Sem nome ${Date.now()}`);
	await questao(page, { enunciado: 'Verdadeiro ou falso?', alternativas: ['V', 'F'], correta: 'A' });
	await page.getByRole('button', { name: 'Salvar atividade' }).click();
	await expect(page).toHaveURL(new RegExp(`${caminho}$`));

	await sair(page);
	await page.goto(caminho);

	// O navegador barra o envio sem nome (`required`), sem nem chamar o servidor.
	await page.getByRole('button', { name: 'Enviar respostas' }).click();
	await expect(page).toHaveURL(new RegExp(`${caminho}$`));
	await expect(page.getByRole('alert')).toHaveCount(0);

	// Só espaços passam pelo navegador e caem na validação do servidor.
	await page.getByLabel('Seu nome').fill('   ');
	await page.getByLabel('Alternativa A', { exact: true }).check();
	await page.getByRole('button', { name: 'Enviar respostas' }).click();
	await expect(page.getByRole('alert')).toContainText('Informe seu nome');

	// Gabarito é a letra A: responder B dá zero.
	await page.getByLabel('Seu nome').fill('Bruno');
	await page.getByLabel('Alternativa B', { exact: true }).check();
	await page.getByRole('button', { name: 'Enviar respostas' }).click();
	await expect(page.getByText('0/1 acertos')).toBeVisible();
});

test('aula linka para a atividade e a query guarda a origem', async ({ page }) => {
	await entrar(page);

	const caminhoAtividade = await criarAtividade(page, `Lista de exercícios ${Date.now()}`);
	await questao(page, { enunciado: '2 + 2?', alternativas: ['3', '4'], correta: 'B' });
	await page.getByRole('button', { name: 'Salvar atividade' }).click();
	await expect(page).toHaveURL(new RegExp(`${caminhoAtividade}$`));

	await page.goto('/apostilas/nova');
	await page.getByLabel('Título').fill('Apostila da lista');
	await page.getByRole('button', { name: 'Criar' }).click();
	await expect(page).toHaveURL(/\/apostilas\/\d+/);
	const apostila = new URL(page.url()).pathname;

	await page.getByRole('button', { name: '+ Nova aula/encontro' }).click();
	await expect(page).toHaveURL(/\/editar/);
	await page.getByLabel('Título da aula').fill('Aula do exercício');
	await page.getByRole('button', { name: 'Link', exact: true }).click();
	await page.getByLabel('Texto do link').fill('Responder atividade');
	await page.getByLabel('Tipo', { exact: true }).selectOption('exercicio');
	const busca = page.getByLabel('Buscar atividade');
	await busca.click();
	await busca.fill('Lista de exercícios');
	await page.getByRole('button', { name: new RegExp('Lista de exercícios') }).click();

	// Dentro da aula o link carrega o contexto da origem.
	await expect(page.getByRole('link', { name: /Responder atividade/ })).toHaveAttribute(
		'href',
		new RegExp(`^${caminhoAtividade}\\?aula=\\d+$`)
	);

	await page.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(page).toHaveURL(/\/aulas\/\d+$/);

	// A listagem de atividades mostra em quais aulas ela é usada.
	await page.goto('/exercicios');
	const cartao = page.locator('li', { hasText: 'Lista de exercícios' }).first();
	await expect(cartao.getByText('Usado em 1 aula')).toBeVisible();
	await expect(cartao.getByRole('link', { name: 'Aula do exercício' })).toHaveAttribute(
		'href',
		new RegExp(`^${apostila}/aulas/\\d+$`)
	);

	// Em uso, a atividade não pode ser excluída.
	await expect(cartao.getByRole('button', { name: 'Excluir' })).toBeDisabled();

	// Seguindo o link da aula, a origem aparece no topo da página do aluno.
	await page.getByRole('link', { name: /Aula do exercício/ }).click();
	await page.getByRole('link', { name: /Responder atividade/ }).click();
	const origem = page.getByLabel('Origem');
	await expect(origem).toContainText('Apostila da lista');
	await expect(origem).toContainText('Aula do exercício');
});

test('checkbox exige o conjunto inteiro, e a dissertativa volta preenchida', async ({ page }) => {
	await entrar(page);

	const caminho = await criarAtividade(page, `Múltipla escolha ${Date.now()}`);
	await questao(page, {
		enunciado: 'Quais são números pares?',
		alternativas: ['2', '3', '4'],
		correta: ['A', 'C'],
		selecao: 'checkbox'
	});
	await dissertativa(page, 'Explique por que 1 não é primo.', 'com as suas palavras');
	await questao(page, {
		enunciado: 'Qual a área?',
		alternativas: ['$x^2$', '2x', 'x + 1'],
		correta: 'A'
	});

	await page.getByRole('button', { name: 'Salvar atividade' }).click();
	await expect(page).toHaveURL(new RegExp(`${caminho}$`));
	await expect(page.locator('legend', { hasText: 'várias respostas' })).toBeVisible();
	// Fórmula com `$...$` sai desenhada (KaTeX), não como código.
	await expect(page.locator('.katex').first()).toBeVisible();

	// A listagem conta os dois tipos de pergunta.
	await page.goto('/exercicios');
	const cartao = page.locator('li', { hasText: 'Múltipla escolha' }).first();
	await expect(cartao.getByText('1 dissertativa')).toBeVisible();

	await sair(page);
	await page.goto(caminho);

	// O nome fica no sessionStorage: sobrevive a recarregar a página.
	await page.getByLabel('Seu nome').fill('Ana Souza');
	await page.reload();
	await expect(page.getByLabel('Seu nome')).toHaveValue('Ana Souza');

	// No checkbox, marcar a certa e mais uma já é errada: precisa do conjunto exato.
	await page.getByLabel('Alternativa A', { exact: true }).first().check();
	await page.getByLabel('Alternativa C', { exact: true }).first().check();
	await page.getByLabel('Alternativa B', { exact: true }).first().check();
	// A segunda questão é de rádio: acertando A, o placar fica 1/2.
	await page.getByLabel('Alternativa A', { exact: true }).nth(1).check();
	await page.getByLabel('Sua resposta').fill('Porque 1 só tem um divisor.');
	await page.getByRole('button', { name: 'Enviar respostas' }).click();

	await expect(page.getByText('1/2 acertos')).toBeVisible();
	await expect(page.getByText('Incorreto — resposta certa: A, C')).toBeVisible();

	// O resultado mostra quais alternativas foram selecionadas, com o gabarito.
	const primeira = page.locator('fieldset', { hasText: 'Quais são números pares?' }).first();
	await expect(primeira.getByText('selecionada')).toHaveCount(3);
	await expect(primeira.getByText('gabarito')).toHaveCount(2);

	// A resposta discursiva aparece para avaliação, em campo somente leitura.
	const respostaAluno = page.getByLabel('Resposta do aluno');
	await expect(respostaAluno).toHaveValue('Porque 1 só tem um divisor.');
	await expect(respostaAluno).toHaveAttribute('readonly', '');
});

test('checkbox sem o conjunto completo zera, e o formulário aceita fórmula e dissertativa', async ({
	page
}) => {
	await entrar(page);

	const caminho = await criarAtividade(page, `Só checkbox ${Date.now()}`);
	await questao(page, {
		enunciado: 'Marque as duas certainíssimas.',
		alternativas: ['a', 'b', 'c'],
		correta: ['A', 'B'],
		selecao: 'checkbox'
	});
	await page.getByRole('button', { name: 'Salvar atividade' }).click();
	await expect(page).toHaveURL(new RegExp(`${caminho}$`));

	await sair(page);
	await page.goto(caminho);
	await page.getByLabel('Seu nome').fill('Bruno');
	await page.getByLabel('Alternativa A', { exact: true }).check();
	await page.getByRole('button', { name: 'Enviar respostas' }).click();

	await expect(page.getByText('0/1 acertos')).toBeVisible();
	await expect(page.getByText('Incorreto — resposta certa: A, B')).toBeVisible();

	// Recarregar devolve o formulário com o nome ainda na sessão.
	await page.getByRole('link', { name: 'Responder de novo' }).click();
	await expect(page.getByLabel('Seu nome')).toHaveValue('Bruno');
});
