import { test, expect, type Page } from '@playwright/test';
import { SENHA_E2E } from './ambiente';

async function entrar(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Senha mestra').fill(SENHA_E2E);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: 'Apostilas', level: 1 })).toBeVisible();
}

const PERGUNTAS_PADRAO = [
	{ pergunta: 'Quanto é 2+2?', alternativas: ['3', '4'], correta: 1, tempo: 15 },
	{ pergunta: 'Quanto é 3+3?', alternativas: ['6', '7'], correta: 0, tempo: 15 }
];

/** Cria um quiz pelo editor, importando o JSON (o caminho mais rápido). */
async function criarQuizImportado(page: Page, titulo: string, perguntas = PERGUNTAS_PADRAO) {
	await page.goto('/quiz');
	await page.getByRole('button', { name: '+ Novo quiz' }).click();
	await expect(page).toHaveURL(/\/quiz\/\d+\/editar/);

	await page.locator('summary', { hasText: 'Colar um JSON pronto' }).click();
	await page.getByLabel('JSON do quiz').fill(JSON.stringify({ titulo, perguntas }));
	await page.getByRole('button', { name: 'Importar perguntas' }).click();
	const plural = perguntas.length === 1 ? '' : 's';
	await expect(page.getByText(`${perguntas.length} pergunta${plural} importada${plural}`)).toBeVisible();
	await page.getByRole('button', { name: 'Salvar quiz' }).click();
	await expect(page).toHaveURL(/\/quiz$/);
}

/** Quantas linhas de texto o elemento ocupa (1 = o texto não quebrou dentro dele). */
function linhasDeTexto(elemento: Element) {
	const range = document.createRange();
	range.selectNodeContents(elemento);
	return range.getClientRects().length;
}

test('rota do quiz exige sessão', async ({ page }) => {
	await page.goto('/quiz');
	await expect(page).toHaveURL(/\/login/);
});

test('home pública tem link para entrar no quiz sem decorar a URL', async ({ page }) => {
	await page.goto('/');
	const link = page.getByRole('link', { name: 'Entrar no quiz' });
	await expect(link).toBeVisible();
	await link.click();
	await expect(page).toHaveURL(/\/quiz\/jogar$/);
	await expect(page.getByLabel('Código da sala')).toBeVisible();
});

test('aluno não entra com código inválido', async ({ page }) => {
	await page.goto('/quiz/jogar');
	await page.getByLabel('Código da sala').fill('ZZZZZZ');
	await page.getByLabel('Seu nome').fill('Aluno Perdido');
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByText('Sala não encontrada')).toBeVisible();
});

test('exportar preenche o textarea com o quiz atual em JSON', async ({ page }) => {
	await entrar(page);
	const token = `Exporta ${Date.now()}`;

	await page.goto('/quiz');
	await page.getByRole('button', { name: '+ Novo quiz' }).click();
	await expect(page).toHaveURL(/\/quiz\/\d+\/editar/);
	await page.getByLabel('Título do quiz').fill(token);

	// Monta uma pergunta à mão.
	await page.getByRole('button', { name: '+ Adicionar pergunta' }).click();
	await page.getByLabel('Enunciado').fill('Quanto é 5+5?');
	await page.getByLabel('Alternativa 1', { exact: true }).fill('10');
	await page.getByLabel('Alternativa 2', { exact: true }).fill('11');

	// Exportar joga o quiz atual no textarea, no mesmo formato que a importação.
	await page.locator('summary', { hasText: 'Colar um JSON pronto' }).click();
	await page.getByRole('button', { name: 'Exportar perguntas' }).click();

	const dados = JSON.parse(await page.getByLabel('JSON do quiz').inputValue());
	expect(dados.titulo).toBe(token);
	expect(dados.perguntas).toHaveLength(1);
	expect(dados.perguntas[0].pergunta).toBe('Quanto é 5+5?');
	expect(dados.perguntas[0].alternativas).toEqual(['10', '11']);
	expect(dados.perguntas[0].correta).toBe(0);
	expect(dados.perguntas[0].tempo).toBeGreaterThan(0);
});

test('encerrar o quiz fecha novas entradas mas quem já está continua', async ({ page, browser }) => {
	await entrar(page);
	const token = `Encerra ${Date.now()}`;
	await criarQuizImportado(page, token);

	// Abre a sala e um aluno entra antes de fechar as entradas.
	await page.goto('/quiz');
	const cartao = page.locator('main ul > li', { hasText: token });
	await cartao.getByRole('button', { name: 'Iniciar' }).click();
	await expect(page).toHaveURL(/\/quiz\/host\/[A-Z0-9]+/);
	const codigo = page.url().split('/').pop()!;

	const contexto = await browser.newContext();
	const jogador = await contexto.newPage();
	await jogador.goto('/quiz/jogar');
	await jogador.getByLabel('Código da sala').fill(codigo);
	await jogador.getByLabel('Seu nome').fill('Aluno Dentro');
	await jogador.getByRole('button', { name: 'Entrar' }).click();
	await expect(jogador).toHaveURL(new RegExp(`/quiz/jogar/${codigo}`));
	await expect(page.getByText('Aluno Dentro').first()).toBeVisible({ timeout: 10000 });

	// Professor encerra: botão vira "Entradas encerradas" e aparece o aviso.
	await page.getByRole('button', { name: 'Encerrar o quiz' }).click();
	await expect(page.getByRole('button', { name: 'Entradas encerradas' })).toBeVisible();
	await expect(page.getByText('quem já está na sala continua até o fim')).toBeVisible();

	// Quem não está na sala não consegue mais entrar (nem voltando com o mesmo nome).
	const reentrada = await contexto.newPage();
	await reentrada.goto('/quiz/jogar');
	await reentrada.getByLabel('Código da sala').fill(codigo);
	await reentrada.getByLabel('Seu nome').fill('Tarde Demais');
	await reentrada.getByRole('button', { name: 'Entrar' }).click();
	await expect(reentrada.getByText('já foi encerrado')).toBeVisible();

	// O aluno que já estava continua: professor inicia e a partida vai até o fim.
	await page.getByRole('button', { name: 'Iniciar quiz' }).click();
	await expect(jogador.getByText('Quanto é 2+2?')).toBeVisible({ timeout: 10000 });
	await jogador.getByRole('button', { name: '4' }).click();
	await expect(jogador.getByText('Quanto é 3+3?')).toBeVisible({ timeout: 15000 });
	await jogador.getByRole('button', { name: '6' }).click();
	await expect(jogador.getByText('Fim!')).toBeVisible({ timeout: 15000 });
	await expect(jogador.getByText('1º', { exact: true })).toBeVisible();

	await contexto.close();
});

test('sair e remover todos apaga a sala e desconecta os alunos', async ({ page, browser }) => {
	await entrar(page);
	const token = `Remove ${Date.now()}`;
	await criarQuizImportado(page, token);

	await page.goto('/quiz');
	const cartao = page.locator('main ul > li', { hasText: token });
	await cartao.getByRole('button', { name: 'Iniciar' }).click();
	await expect(page).toHaveURL(/\/quiz\/host\/[A-Z0-9]+/);
	const codigo = page.url().split('/').pop()!;

	const contexto = await browser.newContext();
	const jogador = await contexto.newPage();
	await jogador.goto('/quiz/jogar');
	await jogador.getByLabel('Código da sala').fill(codigo);
	await jogador.getByLabel('Seu nome').fill('Aluno Atingido');
	await jogador.getByRole('button', { name: 'Entrar' }).click();
	await expect(jogador).toHaveURL(new RegExp(`/quiz/jogar/${codigo}`));
	await expect(page.getByText('Aluno Atingido').first()).toBeVisible({ timeout: 10000 });

	// Professor aceita o confirm e a sala é apagada na hora.
	page.once('dialog', (dialog) => void dialog.accept());
	await page.getByRole('button', { name: 'Sair e remover todos' }).click();
	await expect(page).toHaveURL(/\/quiz$/);

	// O aluno que estava dentro recebe "Sala não encontrada" no próximo polling.
	await expect(jogador.getByText('Sala não encontrada.')).toBeVisible({ timeout: 10000 });

	// E o código deixou de existir para qualquer entrada nova.
	const novato = await contexto.newPage();
	await novato.goto('/quiz/jogar');
	await novato.getByLabel('Código da sala').fill(codigo);
	await novato.getByLabel('Seu nome').fill('Novato');
	await novato.getByRole('button', { name: 'Entrar' }).click();
	await expect(novato.getByText('Sala não encontrada')).toBeVisible();

	await contexto.close();
});

test('fluxo completo: professor abre a sala e o aluno responde', async ({ page, browser }) => {
	await entrar(page);
	const token = `Quiz ${Date.now()}`;
	await criarQuizImportado(page, token);

	// Abre a sala e captura o código.
	await page.goto('/quiz');
	const cartao = page.locator('main ul > li', { hasText: token });
	await cartao.getByRole('button', { name: 'Iniciar' }).click();
	await expect(page).toHaveURL(/\/quiz\/host\/[A-Z0-9]+/);
	const codigo = page.url().split('/').pop()!;
	await expect(page.getByText(codigo, { exact: true })).toBeVisible();

	// O aluno entra com o código, em um contexto sem a sessão do professor.
	const contexto = await browser.newContext();
	const jogador = await contexto.newPage();
	await jogador.goto('/quiz/jogar');
	await jogador.getByLabel('Código da sala').fill(codigo);
	await jogador.getByLabel('Seu nome').fill('Aluno Teste');
	await jogador.getByRole('button', { name: 'Entrar' }).click();
	await expect(jogador).toHaveURL(new RegExp(`/quiz/jogar/${codigo}`));
	await expect(jogador.getByText('Aguardando o professor iniciar o quiz')).toBeVisible();

	// O professor vê o aluno e começa.
	await expect(page.getByText('Aluno Teste').first()).toBeVisible({ timeout: 10000 });
	await page.getByRole('button', { name: 'Iniciar quiz' }).click();

	// Pergunta 1: o aluno acerta.
	await expect(page.getByText('Pergunta 1 de 2')).toBeVisible({ timeout: 10000 });
	await expect(jogador.getByText('Quanto é 2+2?')).toBeVisible({ timeout: 10000 });
	await jogador.getByRole('button', { name: '4' }).click();
	await expect(jogador.getByText('Acertou!')).toBeVisible({ timeout: 10000 });

	// O auto-avanço leva à pergunta 2 (sem o professor clicar em nada).
	await expect(jogador.getByText('Quanto é 3+3?')).toBeVisible({ timeout: 15000 });
	await jogador.getByRole('button', { name: '6' }).click();

	// Fim da partida e ranking.
	await expect(jogador.getByText('Fim!')).toBeVisible({ timeout: 15000 });
	await expect(jogador.getByText('1º', { exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Ranking final' })).toBeVisible({ timeout: 15000 });
	await expect(page.getByText('Aluno Teste').first()).toBeVisible();

	await contexto.close();
});

test('ranking final mostra acertos e erros, e pergunta em branco conta como erro', async ({
	page,
	browser
}) => {
	await entrar(page);
	const token = `Placar ${Date.now()}`;
	await criarQuizImportado(page, token, [
		{ pergunta: 'Qual é a capital da França?', alternativas: ['Paris', 'Roma'], correta: 0, tempo: 15 },
		{ pergunta: 'Qual é a capital da Itália?', alternativas: ['Madri', 'Roma'], correta: 1, tempo: 5 }
	]);

	await page.goto('/quiz');
	const cartao = page.locator('main ul > li', { hasText: token });
	await cartao.getByRole('button', { name: 'Iniciar' }).click();
	await expect(page).toHaveURL(/\/quiz\/host\/[A-Z0-9]+/);
	const codigo = page.url().split('/').pop()!;

	const contexto = await browser.newContext();
	const jogador = await contexto.newPage();
	await jogador.goto('/quiz/jogar');
	await jogador.getByLabel('Código da sala').fill(codigo);
	await jogador.getByLabel('Seu nome').fill('Aluno Placar');
	await jogador.getByRole('button', { name: 'Entrar' }).click();
	await expect(jogador).toHaveURL(new RegExp(`/quiz/jogar/${codigo}`));
	await expect(page.getByText('Aluno Placar').first()).toBeVisible({ timeout: 10000 });

	await page.getByRole('button', { name: 'Iniciar quiz' }).click();

	// Acerta a primeira...
	await jogador.getByRole('button', { name: 'Paris' }).click();
	await expect(jogador.getByText('Acertou!')).toBeVisible({ timeout: 10000 });

	// ...e deixa a segunda estourar o tempo em branco: ela conta como erro.
	await expect(jogador.getByText('Qual é a capital da Itália?')).toBeVisible({ timeout: 15000 });
	await expect(jogador.getByText('Fim!')).toBeVisible({ timeout: 20000 });
	await expect(jogador.getByText('1 acerto · 1 erro')).toBeVisible();

	await expect(page.getByRole('heading', { name: 'Ranking final' })).toBeVisible({ timeout: 15000 });
	await expect(page.getByText('1 acerto · 1 erro')).toBeVisible();

	await contexto.close();
});

test('alternativa longa não quebra o badge da resposta em duas linhas', async ({ page, browser }) => {
	await entrar(page);
	const token = `Longa ${Date.now()}`;
	const longa =
		'Alternativa com um texto bem comprido, do tamanho que aparece numa questão de verdade, ' +
		'para o badge da resposta não ter espaço nenhum sobrando na mesma linha.';
	await criarQuizImportado(page, token, [
		{ pergunta: 'Qual é a alternativa longa?', alternativas: [longa, 'Curta'], correta: 0, tempo: 60 }
	]);

	// Tela estreita (celular do aluno): é onde falta espaço para o badge.
	await page.setViewportSize({ width: 390, height: 844 });

	await page.goto('/quiz');
	const cartao = page.locator('main ul > li', { hasText: token });
	await cartao.getByRole('button', { name: 'Iniciar' }).click();
	await expect(page).toHaveURL(/\/quiz\/host\/[A-Z0-9]+/);
	const codigo = page.url().split('/').pop()!;

	const contexto = await browser.newContext({ viewport: { width: 390, height: 844 } });
	const jogador = await contexto.newPage();
	await jogador.goto('/quiz/jogar');
	await jogador.getByLabel('Código da sala').fill(codigo);
	await jogador.getByLabel('Seu nome').fill('Aluno Longo');
	await jogador.getByRole('button', { name: 'Entrar' }).click();
	await expect(jogador).toHaveURL(new RegExp(`/quiz/jogar/${codigo}`));
	await expect(page.getByText('Aluno Longo').first()).toBeVisible({ timeout: 10000 });

	await page.getByRole('button', { name: 'Iniciar quiz' }).click();
	const alternativa = jogador.getByRole('button', { name: /espaço nenhum sobrando/ });
	await expect(alternativa).toBeVisible({ timeout: 10000 });
	await alternativa.click();

	// O badge fica com o tamanho do texto dele: quem quebra é o texto da alternativa.
	const resposta = jogador.locator('.badge', { hasText: 'sua resposta' });
	const correta = jogador.locator('.badge', { hasText: 'correta' });
	await expect(resposta).toBeVisible({ timeout: 10000 });
	expect(await resposta.evaluate(linhasDeTexto)).toBe(1);
	await expect(correta).toBeVisible({ timeout: 10000 });
	expect(await correta.evaluate(linhasDeTexto)).toBe(1);

	await expect(page.locator('.badge', { hasText: 'correta' })).toBeVisible({ timeout: 10000 });
	expect(await page.locator('.badge', { hasText: 'correta' }).evaluate(linhasDeTexto)).toBe(1);

	await contexto.close();
});
