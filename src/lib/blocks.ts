// Tipos e helpers dos blocos de conteúdo de uma aula.
// Blocos são armazenados como JSON na coluna `aulas.blocos`.

import { caminhoAnexo, caminhoAula, caminhoExercicio } from '$lib/conteudo';
import type { NomeIcone } from '$lib/icones';
import { SELECOES_EXERCICIO, type SelecaoExercicio } from '$lib/conteudo';

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
export type BlocoTabela = { id: string; tipo: 'tabela'; cabecalho: string[]; linhas: string[][] };
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
	| BlocoDissertativa;
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
			return { id, tipo, cabecalho: ['Coluna 1'], linhas: [['']] };
		case 'formula':
			return { id, tipo, latex: 'E = mc^2', destaque: true };
		case 'exercicio':
			return { id, tipo, pergunta: '', alternativas: ['', ''], selecao: 'radio', correta: 0 };
		case 'dissertativa':
			return { id, tipo, pergunta: '', orientacao: '' };
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
	{ id: 'dissertativa', rotulo: 'Dissertativa', icone: 'dissertativa' }
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
	'dissertativa'
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
			return (
				Array.isArray(b.cabecalho) &&
				b.cabecalho.every((c) => typeof c === 'string') &&
				Array.isArray(b.linhas) &&
				b.linhas.every((l) => Array.isArray(l) && l.every((c) => typeof c === 'string'))
			);
		case 'formula':
			return typeof b.latex === 'string' && (b.destaque === undefined || typeof b.destaque === 'boolean');
		case 'exercicio':
			return ehBlocoExercicio(b);
		case 'dissertativa':
			return (
				typeof b.pergunta === 'string' &&
				(b.orientacao === undefined || b.orientacao === null || typeof b.orientacao === 'string')
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
		case 'tabela':
			return {
				id: bloco.id,
				tipo: 'tabela',
				cabecalho: bloco.cabecalho.map((c) => String(c)),
				linhas: bloco.linhas.map((l) => l.map((c) => String(c)))
			};
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