// Tipos e helpers dos blocos de conteúdo de uma aula.
// Blocos são armazenados como JSON na coluna `aulas.blocos`.

import { caminhoAnexo, caminhoAula, caminhoExercicio } from '$lib/conteudo';
import type { NomeIcone } from '$lib/icones';
import { SELECOES_EXERCICIO, type SelecaoExercicio } from '$lib/conteudo';
import { lerTabela, type DadosTabela } from '$lib/tabela';

export { SELECOES_EXERCICIO, type SelecaoExercicio };

export type BlocoTexto = { id: string; tipo: 'texto'; conteudo: string };
export type BlocoTitulo = {
	id: string;
	tipo: 'titulo';
	texto: string;
	nivel: NivelTitulo;
};
export type BlocoCodigo = { id: string; tipo: 'codigo'; linguagem: string; codigo: string };
export type BlocoMermaid = { id: string; tipo: 'mermaid'; diagrama: string; tema: TemaMermaid };

// Níveis do bloco `titulo`: os 6 do HTML. Sai tag de verdade (`h1`…`h6`), então o
// sumário do navegador, a impressão e o leitor de tela veem a hierarquia.
export const NIVEIS_TITULO = [
	{ valor: 1, rotulo: 'H1' },
	{ valor: 2, rotulo: 'H2' },
	{ valor: 3, rotulo: 'H3' },
	{ valor: 4, rotulo: 'H4' },
	{ valor: 5, rotulo: 'H5' },
	{ valor: 6, rotulo: 'H6' }
] as const;
export type NivelTitulo = (typeof NIVEIS_TITULO)[number]['valor'];

const NIVEIS_TITULO_VALIDOS = new Set<string>(NIVEIS_TITULO.map((nivel) => String(nivel.valor)));

export function ehNivelTitulo(valor: unknown): valor is NivelTitulo {
	return typeof valor === 'number' && NIVEIS_TITULO_VALIDOS.has(String(valor));
}

// Temas do Mermaid aceitos no editor. `null` (sem estilo) e os temas
// experimentais ficam de fora: são ruins de escolher e não somem em print.
export const TEMAS_MERMAID = [
	{ valor: 'neutral', rotulo: 'Neutro' },
	{ valor: 'default', rotulo: 'Padrão' },
	{ valor: 'forest', rotulo: 'Floresta' },
	{ valor: 'dark', rotulo: 'Escuro' },
	{ valor: 'base', rotulo: 'Base' }
] as const;
export type TemaMermaid = (typeof TEMAS_MERMAID)[number]['valor'];

export const TEMA_MERMAID_PADRAO: TemaMermaid = 'neutral';

const TEMAS_MERMAID_VALIDOS = new Set<string>(TEMAS_MERMAID.map((tema) => tema.valor));

export function ehTemaMermaid(valor: unknown): valor is TemaMermaid {
	return typeof valor === 'string' && TEMAS_MERMAID_VALIDOS.has(valor);
}
export type BlocoImagem = { id: string; tipo: 'imagem'; src: string; legenda?: string };
export type BlocoLink = {
	id: string;
	tipo: 'link';
	rotulo: string;
	tipoLink: 'exercicio' | 'anexo' | 'aula' | 'externo';
	url?: string;
	alvoId?: number;
};
// A tabela inteira é uma matriz só (`linhas`), com o cabeçalho por contagem —
// ver `$lib/tabela`. O campo `cabecalho` do formato antigo continua sendo
// **lido** (é o que está no banco e o que a IA gera), mas nunca mais gravado.
export type BlocoTabela = { id: string; tipo: 'tabela' } & DadosTabela;
export type BlocoFormula = { id: string; tipo: 'formula'; latex: string; destaque: boolean };
// Como o aluno responde: um botão de rádio (uma alternativa verdadeira) ou
// caixas de seleção (várias alternativas verdadeiras). Definido em
// `$lib/conteudo` (re-exportado aqui) porque o payload público também usa.
//
// `correta` é número em `radio` e lista em `checkbox`. Bloco gravado antes do
// campo `selecao` é `radio` com número — daí os normalizadores aceitarem os dois
// formatos (ver `corretasDoExercicio`).
export type BlocoExercicio = {
	id: string;
	tipo: 'exercicio';
	pergunta: string;
	alternativas: string[];
	selecao: SelecaoExercicio;
	correta: number | number[];
	explicacao?: string;
};

// Atividade aberta: o aluno escreve a resposta e ela aparece no resultado para
// avaliação. Não entra na nota automática.
export type BlocoDissertativa = {
	id: string;
	tipo: 'dissertativa';
	pergunta: string;
	orientacao?: string;
};

// Simulação: código p5/q5 que roda no navegador do aluno, dentro de uma iframe com
// `sandbox` (o código do professor não alcança a sessão nem o DOM da página).
export type BlocoSimulacao = {
	id: string;
	tipo: 'simulacao';
	biblioteca: BibliotecaSimulacao;
	codigo: string;
	altura: number;
};

// Bloco HTML: o professor passa markup, estilo e script, e o conjunto roda no
// navegador do aluno dentro da mesma iframe sandboxed da simulação (mesma origem
// opaca, mesmo dublê de armazenamento — ver `$lib/casca-sandbox.ts`). Separa os
// três painéis como no CodePen; `<script>` (inline ou via `src`/CDN) no painel
// HTML roda de verdade — a casca recria os nós depois do `innerHTML`.
export type BlocoHtml = {
	id: string;
	tipo: 'html';
	html: string;
	css: string;
	js: string;
	altura: number;
};

// Exemplo do bloco novo: HTML + CSS + JS de verdade, não placeholder. O layout
// não fixa tamanho (a caixa é do professor) e o clique prova que os três painéis
// conversam.
const EXEMPLO_HTML_MARKUP = `<div class="cartao">
  <h2>Olá, HTML!</h2>
  <p>Aperte o botão.</p>
  <button id="botao">Clique aqui</button>
  <p id="saida"></p>
</div>`;

const EXEMPLO_HTML_CSS = `body { font-family: system-ui, sans-serif; display: grid; place-items: center; }
.cartao { text-align: center; padding: 1.5rem; border: 1px solid #d4d4d4; border-radius: 12px; }
button { padding: 0.5rem 1rem; font-size: 1rem; cursor: pointer; }`;

const EXEMPLO_HTML_JS = `const botao = document.getElementById('botao');
const saida = document.getElementById('saida');
botao.addEventListener('click', () => {
  saida.textContent = 'Você clicou!';
});`;

export const EXEMPLOS_HTML = { html: EXEMPLO_HTML_MARKUP, css: EXEMPLO_HTML_CSS, js: EXEMPLO_HTML_JS };

// Bibliotecas aceitas. As duas rodam em modo global (`setup`/`draw` no `window` da
// iframe), que é o jeito que o professor escreve; a escolha muda o arquivo servido
// por `/lib` e o código de exemplo do bloco novo.
//
// Os dois exemplos são **responsivos** (`window.innerWidth/innerHeight` + `windowResized`)
// de propósito: o canvas é esticado para ocupar a caixa toda (é o que dá largura para
// projeto mais complexo), então tamanho fixo apareceria achatado.
const EXEMPLO_P5 = `function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
}

function draw() {
  background(20, 24, 33);
  const ang = frameCount * 0.04;

  translate(width / 2, height / 4);
  stroke(120);
  line(0, 0, 0, height / 2);

  const raio = height / 2 - 30;
  const x = raio * sin(ang);
  const y = raio * cos(ang);
  line(0, 0, x, y);
  noStroke();
  fill(120, 200, 255);
  circle(x, y, 18);
}

function windowResized() {
  resizeCanvas(window.innerWidth, window.innerHeight);
}`;

const EXEMPLO_Q5 = `function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
}

function draw() {
  background(20, 24, 33);
  const ang = frameCount * 0.04;

  translate(width / 2, height / 4);
  stroke(120);
  line(0, 0, 0, height / 2);

  const raio = height / 2 - 30;
  const x = raio * sin(ang);
  const y = raio * cos(ang);
  line(0, 0, x, y);
  noStroke();
  fill(120, 200, 255);
  ellipse(x, y, 18);
}

function windowResized() {
  resizeCanvas(window.innerWidth, window.innerHeight);
}`;

export const BIBLIOTECAS_SIMULACAO = [
	{ valor: 'p5', rotulo: 'p5', arquivo: 'p5.min.js', exemplo: EXEMPLO_P5 },
	{ valor: 'q5', rotulo: 'q5', arquivo: 'q5.js', exemplo: EXEMPLO_Q5 }
] as const;
export type BibliotecaSimulacao = (typeof BIBLIOTECAS_SIMULACAO)[number]['valor'];

export const BIBLIOTECA_SIMULACAO_PADRAO: BibliotecaSimulacao = 'p5';

const BIBLIOTECAS_SIMULACAO_VALIDAS = new Set<string>(
	BIBLIOTECAS_SIMULACAO.map((biblioteca) => biblioteca.valor)
);

export function ehBibliotecaSimulacao(valor: unknown): valor is BibliotecaSimulacao {
	return typeof valor === 'string' && BIBLIOTECAS_SIMULACAO_VALIDAS.has(valor);
}

// Arquivo da lib no browser, para a iframe carregar por `/lib/<arquivo>`, e código de
// exemplo (entra no bloco novo e troca junto quando o professor troca a biblioteca
// enquanto o código ainda é o exemplo anterior).
//
// O `!` é seguro pelo tipo: `BibliotecaSimulacao` é derivado de `BIBLIOTECAS_SIMULACAO`,
// então o `find` sempre acha — o `??` que estava aqui antes era caminho morto.
export function arquivoBibliotecaSimulacao(biblioteca: BibliotecaSimulacao): string {
	return BIBLIOTECAS_SIMULACAO.find((item) => item.valor === biblioteca)!.arquivo;
}

export function exemploBibliotecaSimulacao(biblioteca: BibliotecaSimulacao): string {
	return BIBLIOTECAS_SIMULACAO.find((item) => item.valor === biblioteca)!.exemplo;
}

const ALTURA_SIMULACAO_PADRAO = 240;
const ALTURA_SIMULACAO_MINIMA = 120;
const ALTURA_SIMULACAO_MAXIMA = 900;

export const ALTURAS_SIMULACAO = { minima: ALTURA_SIMULACAO_MINIMA, maxima: ALTURA_SIMULACAO_MAXIMA };

export function ehAlturaSimulacao(valor: unknown): valor is number {
	return (
		typeof valor === 'number' &&
		Number.isFinite(valor) &&
		valor >= ALTURA_SIMULACAO_MINIMA &&
		valor <= ALTURA_SIMULACAO_MAXIMA
	);
}

// Caixa do bloco HTML: mesma faixa da simulação, mas com padrão próprio (o de lá
// foi escolhido para o canvas do p5 e é baixo demais para mostrar markup).
const ALTURA_HTML_PADRAO = 300;
const ALTURA_HTML_MINIMA = 120;
const ALTURA_HTML_MAXIMA = 900;

export const ALTURAS_HTML = { minima: ALTURA_HTML_MINIMA, maxima: ALTURA_HTML_MAXIMA };

export function ehAlturaHtml(valor: unknown): valor is number {
	return (
		typeof valor === 'number' &&
		Number.isFinite(valor) &&
		valor >= ALTURA_HTML_MINIMA &&
		valor <= ALTURA_HTML_MAXIMA
	);
}

export type Bloco =
	| BlocoTexto
	| BlocoTitulo
	| BlocoCodigo
	| BlocoMermaid
	| BlocoImagem
	| BlocoLink
	| BlocoTabela
	| BlocoFormula
	| BlocoExercicio
	| BlocoDissertativa
	| BlocoSimulacao
	| BlocoHtml;
export type Blocos = Bloco[];

export function ehMultiplaEscolha(bloco: { selecao?: unknown }): boolean {
	return bloco.selecao === 'checkbox';
}

// Lista canônica de alternativas corretas, aceitando o formato antigo (número).
// Índices fora da faixa saem: alternativa removida não pode continuar no gabarito.
export function corretasDoExercicio(bloco: {
	alternativas: string[];
	correta: number | number[];
}): number[] {
	const cru = Array.isArray(bloco.correta) ? bloco.correta : [bloco.correta];
	const total = bloco.alternativas.length;
	const validos = cru.filter(
		(indice): indice is number =>
			typeof indice === 'number' && Number.isInteger(indice) && indice >= 0 && indice < total
	);
	return [...new Set(validos)].sort((a, b) => a - b);
}

export function novoId(): string {
	return crypto.randomUUID();
}

export function criarBloco(tipo: Bloco['tipo']): Bloco {
	const id = novoId();
	switch (tipo) {
		case 'titulo':
			// H1 é o padrão: quem cria o título de uma seção quer o topo da
			// hierarquia, e H2 era só o resquício do select de 3 níveis.
			return { id, tipo, texto: '', nivel: 1 };
		case 'texto':
			return { id, tipo, conteudo: '' };
		case 'codigo':
			return { id, tipo, linguagem: 'js', codigo: '' };
		case 'mermaid':
			return { id, tipo, diagrama: 'flowchart LR\n  A --> B', tema: TEMA_MERMAID_PADRAO };
		case 'imagem':
			return { id, tipo, src: '' };
		case 'link':
			return { id, tipo, rotulo: '', tipoLink: 'externo' };
		case 'tabela':
			return {
				id,
				tipo,
				linhas: [['Coluna 1'], ['']],
				linhasCabecalho: 1,
				colunasCabecalho: 0
			};
		case 'formula':
			return { id, tipo, latex: 'E = mc^2', destaque: true };
		case 'exercicio':
			return { id, tipo, pergunta: '', alternativas: ['', ''], selecao: 'radio', correta: 0 };
		case 'dissertativa':
			return { id, tipo, pergunta: '', orientacao: '' };
		case 'simulacao': {
			const biblioteca = BIBLIOTECA_SIMULACAO_PADRAO;
			const exemplo = BIBLIOTECAS_SIMULACAO.find((item) => item.valor === biblioteca)?.exemplo;
			return { id, tipo, biblioteca, codigo: exemplo ?? '', altura: ALTURA_SIMULACAO_PADRAO };
		}
		case 'html':
			return {
				id,
				tipo,
				html: EXEMPLO_HTML_MARKUP,
				css: EXEMPLO_HTML_CSS,
				js: EXEMPLO_HTML_JS,
				altura: ALTURA_HTML_PADRAO
			};
	}
}

export const TIPOS_BLOCO = [
	{ id: 'titulo', rotulo: 'Título', icone: 'titulo' },
	{ id: 'texto', rotulo: 'Texto', icone: 'texto' },
	{ id: 'codigo', rotulo: 'Código', icone: 'codigo' },
	{ id: 'mermaid', rotulo: 'Diagrama', icone: 'mermaid' },
	{ id: 'imagem', rotulo: 'Imagem', icone: 'imagem' },
	{ id: 'link', rotulo: 'Link', icone: 'link' },
	{ id: 'tabela', rotulo: 'Tabela', icone: 'tabela' },
	{ id: 'formula', rotulo: 'Fórmula', icone: 'formula' },
	{ id: 'exercicio', rotulo: 'Exercício', icone: 'exercicio' },
	{ id: 'dissertativa', rotulo: 'Dissertativa', icone: 'dissertativa' },
	{ id: 'simulacao', rotulo: 'Simulação', icone: 'simulacao' },
	{ id: 'html', rotulo: 'HTML', icone: 'html' }
] as const satisfies readonly { id: Bloco['tipo']; rotulo: string; icone: NomeIcone }[];

// Formato de aula usado nas páginas (id + campos de exibição), independente do row do drizzle.
export type AulaUi = {
	id: number;
	apostilaId: number;
	titulo: string;
	descricao: string | null;
	secaoId: number | null;
	ordem: number;
};

export type SecaoUi = {
	id: number;
	apostilaId: number;
	nome: string;
	ordem: number;
};

export type GrupoAulas<T> = { secao: SecaoUi | null; aulas: T[] };

export function agruparPorSecao<T extends AulaUi>(secoes: SecaoUi[], aulas: T[]): GrupoAulas<T>[] {
	const porId = new Map<number, GrupoAulas<T>>();
	for (const secao of [...secoes].sort((a, b) => a.ordem - b.ordem || a.id - b.id)) {
		porId.set(secao.id, { secao, aulas: [] });
	}
	const semSecao: GrupoAulas<T> = { secao: null, aulas: [] };

	for (const aula of aulas) {
		const grupo = (aula.secaoId !== null ? porId.get(aula.secaoId) : null) ?? semSecao;
		grupo.aulas.push(aula);
	}

	const grupos = [...porId.values()].filter((grupo) => grupo.aulas.length > 0);
	return semSecao.aulas.length > 0 ? [...grupos, semSecao] : grupos;
}

export const LIMITE_NOME_SECAO = 60;

export function normalizarNomeSecao(valor: unknown): string {
	return String(valor ?? '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, LIMITE_NOME_SECAO);
}

export function mesmoNomeSecao(a: string, b: string): boolean {
	return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }) === 0;
}

const TIPOS_VALIDOS = new Set<Bloco['tipo']>([
	'titulo',
	'texto',
	'codigo',
	'mermaid',
	'imagem',
	'link',
	'tabela',
	'formula',
	'exercicio',
	'dissertativa',
	'simulacao',
	'html'
]);

const TIPOS_LINK = new Set<BlocoLink['tipoLink']>(['exercicio', 'anexo', 'aula', 'externo']);

function ehUrlSegura(valor: unknown): valor is string {
	if (typeof valor !== 'string' || valor.trim() === '' || valor.startsWith('//')) return false;
	try {
		return ['http:', 'https:'].includes(new URL(valor, 'https://mcurso.local').protocol);
	} catch {
		return false;
	}
}

function ehAlvo(valor: unknown): valor is number {
	return typeof valor === 'number' && Number.isInteger(valor) && valor > 0;
}

export function ehBloco(valor: unknown): valor is Bloco {
	if (!valor || typeof valor !== 'object') return false;
	const b = valor as Record<string, unknown>;
	if (typeof b.id !== 'string' || b.id === '' || !TIPOS_VALIDOS.has(b.tipo as Bloco['tipo'])) return false;
	switch (b.tipo) {
		case 'titulo':
			return typeof b.texto === 'string' && ehNivelTitulo(b.nivel);
		case 'texto':
			return typeof b.conteudo === 'string';
		case 'codigo':
			return typeof b.codigo === 'string' && typeof b.linguagem === 'string';
		case 'mermaid':
			// O tema é cosmético: um valor desconhecido é saneado no
			// `normalizarCamposBloco`, e bloco antigo sem o campo vale o padrão.
			return (
				typeof b.diagrama === 'string' && (b.tema === undefined || typeof b.tema === 'string')
			);
		case 'imagem':
			return typeof b.src === 'string' && (b.legenda === undefined || typeof b.legenda === 'string');
		case 'link':
			if (typeof b.rotulo !== 'string' || !TIPOS_LINK.has(b.tipoLink as BlocoLink['tipoLink'])) {
				return false;
			}
			if (b.tipoLink === 'aula' || b.tipoLink === 'anexo' || b.tipoLink === 'exercicio') {
				return ehAlvo(b.alvoId) || (b.tipoLink === 'aula' && ehAlvo(b.aulaId));
			}
			return ehUrlSegura(b.url);
		case 'tabela':
			// `cabecalho` + `linhas` (formato antigo) e `linhas` + contagens
			// (formato novo) são lidos; o que não dá para ler, sai.
			return lerTabela(b) !== null;
		case 'formula':
			return typeof b.latex === 'string' && (b.destaque === undefined || typeof b.destaque === 'boolean');
		case 'exercicio':
			return ehBlocoExercicio(b);
		case 'dissertativa':
			return (
				typeof b.pergunta === 'string' &&
				(b.orientacao === undefined || b.orientacao === null || typeof b.orientacao === 'string')
			);
		case 'simulacao':
			// `biblioteca` e `altura` são cosméticas: valor fora da lista é saneado
			// no `normalizarCamposBloco` e bloco sem os campos vale o padrão, igual ao
			// tema do Mermaid. Só o código é obrigatório.
			return (
				typeof b.codigo === 'string' &&
				(b.biblioteca === undefined || typeof b.biblioteca === 'string') &&
				(b.altura === undefined || typeof b.altura === 'number')
			);
		case 'html':
			// Os três painéis são o conteúdo do bloco, então todos são exigidos
			// (vazios valem). `altura` é cosmética, saneada como a da simulação.
			return (
				typeof b.html === 'string' &&
				typeof b.css === 'string' &&
				typeof b.js === 'string' &&
				(b.altura === undefined || typeof b.altura === 'number')
			);
	}
	return false;
}

function ehBlocoExercicio(b: Record<string, unknown>): boolean {
	const { pergunta, alternativas, explicacao, selecao, correta } = b;
	if (typeof pergunta !== 'string') return false;
	if (!Array.isArray(alternativas) || alternativas.length < 2) return false;
	if (!alternativas.every((alternativa) => typeof alternativa === 'string')) return false;
	if (!(explicacao === undefined || explicacao === null || typeof explicacao === 'string')) return false;

	// `selecao` ausente = bloco antigo, de uma resposta só. Valor fora da lista é
	// cosmético: saneado no `normalizarCamposBloco` (o bloco tem mais valor que o
	// formato do gabarito), igual ao tema do Mermaid.
	if (selecao !== undefined && typeof selecao !== 'string') return false;

	const noIntervalo = (valor: unknown) =>
		typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor < alternativas.length;
	if (noIntervalo(correta)) return true;

	// Várias corretas: tem de haver ao menos uma, senão a questão não tem resposta.
	return Array.isArray(correta) && correta.length > 0 && correta.every(noIntervalo);
}

// Sanitiza blocos vindos de um POST (nunca confie no JSON bruto do cliente).
export function normalizarBlocos(valor: unknown): Blocos {
	if (!Array.isArray(valor)) return [];
	return valor.filter(ehBloco).map(normalizarCamposBloco);
}

// Garante campos opcionais com valores seguros por tipo.
function normalizarCamposBloco(bloco: Bloco): Bloco {
	switch (bloco.tipo) {
		case 'texto':
			// Só a quebra de linha: em markdown a indentação é sintaxe (código
			// cercado, lista aninhada), então não dá para dar `trim` no texto.
			// Um `\r` que venha de POST ou import quebraria a lista na leitura.
			return { id: bloco.id, tipo: 'texto', conteudo: bloco.conteudo.replace(/\r\n?/g, '\n') };
		case 'mermaid':
			return {
				id: bloco.id,
				tipo: 'mermaid',
				diagrama: bloco.diagrama,
				tema: ehTemaMermaid(bloco.tema) ? bloco.tema : TEMA_MERMAID_PADRAO
			};
		case 'link':
			return normalizarLink(bloco);
		case 'tabela': {
			// O formato antigo é dobrado no novo aqui (`lerTabela`); daqui para
			// frente o bloco é gravado sempre no formato canônico, com os spans já
			// dentro da faixa e a legenda/zebra preservadas.
			const tabela = lerTabela(bloco) ?? { linhas: [['']], linhasCabecalho: 0, colunasCabecalho: 0 };
			return { id: bloco.id, tipo: 'tabela', ...tabela };
		}
		case 'formula':
			return { id: bloco.id, tipo: 'formula', latex: bloco.latex, destaque: bloco.destaque !== false };
		case 'exercicio': {
			// Anotado para o literal não alargar para `string`.
			const selecao: SelecaoExercicio = bloco.selecao === 'checkbox' ? 'checkbox' : 'radio';
			const base = {
				id: bloco.id,
				tipo: 'exercicio' as const,
				pergunta: bloco.pergunta,
				alternativas: bloco.alternativas.map((a) => String(a)),
				selecao,
				explicacao: typeof bloco.explicacao === 'string' ? bloco.explicacao : undefined
			};
			const corretas = corretasDoExercicio(bloco);
			// Checkbox sem gabarito não tem resposta certa: fica a primeira.
			return {
				...base,
				correta: selecao === 'radio' ? (corretas[0] ?? 0) : (corretas.length > 0 ? corretas : [0])
			};
		}
		case 'dissertativa':
			return {
				id: bloco.id,
				tipo: 'dissertativa',
				pergunta: bloco.pergunta,
				orientacao: typeof bloco.orientacao === 'string' ? bloco.orientacao : undefined
			};
		case 'simulacao': {
			// Biblioteca fora da lista e altura fora da faixa caem no padrão: o código
			// do professor vale mais que o formato da caixa.
			const legado = bloco as BlocoSimulacao & { biblioteca?: unknown; altura?: unknown };
			const biblioteca = ehBibliotecaSimulacao(legado.biblioteca)
				? legado.biblioteca
				: BIBLIOTECA_SIMULACAO_PADRAO;
			return {
				id: bloco.id,
				tipo: 'simulacao',
				biblioteca,
				codigo: bloco.codigo,
				altura: ehAlturaSimulacao(legado.altura) ? legado.altura : ALTURA_SIMULACAO_PADRAO
			};
		}
		case 'html': {
			// Altura fora da faixa cai no padrão: o conteúdo do professor vale mais
			// que o formato da caixa.
			const legado = bloco as BlocoHtml & { altura?: unknown };
			return {
				id: bloco.id,
				tipo: 'html',
				html: bloco.html,
				css: bloco.css,
				js: bloco.js,
				altura: ehAlturaHtml(legado.altura) ? legado.altura : ALTURA_HTML_PADRAO
			};
		}
		default:
			return bloco;
	}
}

// Link interno guarda só o `alvoId` (id da aula na apostila atual, de um anexo
// solto ou de uma atividade). O `aulaId` de conteúdos antigos vira `alvoId`;
// link externo guarda a `url`.
function normalizarLink(bloco: Bloco & { tipo: 'link' }): BlocoLink {
	const legado = bloco as BlocoLink & { aulaId?: unknown };
	const base: BlocoLink = { id: bloco.id, tipo: 'link', rotulo: bloco.rotulo, tipoLink: bloco.tipoLink };
	if (bloco.tipoLink === 'aula' || bloco.tipoLink === 'anexo' || bloco.tipoLink === 'exercicio') {
		const alvoId = ehAlvo(bloco.alvoId) ? bloco.alvoId : ehAlvo(legado.aulaId) ? legado.aulaId : undefined;
		return alvoId === undefined ? base : { ...base, alvoId };
	}
	return ehUrlSegura(bloco.url) ? { ...base, url: bloco.url } : base;
}

// Link para uma aula/anexo/atividade renderiza como rota interna de conteúdo.
// Aula depende da apostila que a contém; anexo e atividade são soltos. Sem
// `apostilaId` (dentro de um anexo) um link de aula não tem para onde apontar.
//
// Atividade dentro de uma aula leva `?aula=`: é o contexto que a chave do
// resultado registra, então o aluno responde "dentro" da aula de onde clicou.
export function hrefLinkInterno(
	bloco: BlocoLink,
	apostilaId: number | undefined,
	baseHref = '/apostilas',
	aulaContexto?: number
): string | null {
	if (bloco.tipoLink !== 'aula' && bloco.tipoLink !== 'anexo' && bloco.tipoLink !== 'exercicio') return null;
	if (!ehAlvo(bloco.alvoId)) return null;
	if (bloco.tipoLink === 'anexo') return caminhoAnexo(bloco.alvoId);
	if (bloco.tipoLink === 'exercicio') {
		const caminho = caminhoExercicio(bloco.alvoId);
		return aulaContexto === undefined ? caminho : `${caminho}?aula=${aulaContexto}`;
	}
	return apostilaId === undefined ? null : caminhoAula(apostilaId, bloco.alvoId, '', baseHref);
}

// Blocos que apontam para um conteúdo (usado nos links reversos do anexo e da
// atividade). O tipo entra no filtro porque `aulas.id`, `anexos.id` e
// `exercicios.id` são espaços distintos.
export function linksPara(blocos: Blocos, alvo: { tipo: 'aula' | 'anexo' | 'exercicio'; id: number }) {
	return blocos.filter(
		(bloco): bloco is BlocoLink =>
			bloco.tipo === 'link' && bloco.tipoLink === alvo.tipo && bloco.alvoId === alvo.id
	);
}