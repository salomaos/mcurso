// Tipos e helpers dos blocos de conteúdo de uma aula.
// Blocos são armazenados como JSON na coluna `aulas.blocos`.

export type BlocoTexto = { id: string; tipo: 'texto'; conteudo: string };
export type BlocoTitulo = { id: string; tipo: 'titulo'; texto: string; nivel: 1 | 2 | 3 };
export type BlocoCodigo = { id: string; tipo: 'codigo'; linguagem: string; codigo: string };
export type BlocoMermaid = { id: string; tipo: 'mermaid'; diagrama: string };
export type BlocoImagem = { id: string; tipo: 'imagem'; src: string; legenda?: string };
export type BlocoLink = {
	id: string;
	tipo: 'link';
	rotulo: string;
	tipoLink: 'exercicio' | 'anexo' | 'aula' | 'externo';
	url?: string;
	aulaId?: number;
};
export type BlocoTabela = { id: string; tipo: 'tabela'; cabecalho: string[]; linhas: string[][] };
export type BlocoFormula = { id: string; tipo: 'formula'; latex: string; destaque: boolean };
export type BlocoExercicio = {
	id: string;
	tipo: 'exercicio';
	pergunta: string;
	alternativas: string[];
	correta: number;
	explicacao?: string;
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
	| BlocoExercicio;
export type Blocos = Bloco[];

export function novoId(): string {
	return crypto.randomUUID();
}

export function criarBloco(tipo: Bloco['tipo']): Bloco {
	const id = novoId();
	switch (tipo) {
		case 'titulo':
			return { id, tipo, texto: '', nivel: 2 };
		case 'texto':
			return { id, tipo, conteudo: '' };
		case 'codigo':
			return { id, tipo, linguagem: 'js', codigo: '' };
		case 'mermaid':
			return { id, tipo, diagrama: 'flowchart LR\n  A --> B' };
		case 'imagem':
			return { id, tipo, src: '' };
		case 'link':
			return { id, tipo, rotulo: '', tipoLink: 'externo' };
		case 'tabela':
			return { id, tipo, cabecalho: ['Coluna 1'], linhas: [['']] };
		case 'formula':
			return { id, tipo, latex: 'E = mc^2', destaque: true };
		case 'exercicio':
			return { id, tipo, pergunta: '', alternativas: ['', ''], correta: 0 };
	}
}

export const TIPOS_BLOCO = [
	{ id: 'titulo', rotulo: 'Título' },
	{ id: 'texto', rotulo: 'Texto' },
	{ id: 'codigo', rotulo: 'Código' },
	{ id: 'mermaid', rotulo: 'Diagrama' },
	{ id: 'imagem', rotulo: 'Imagem' },
	{ id: 'link', rotulo: 'Link' },
	{ id: 'tabela', rotulo: 'Tabela' },
	{ id: 'formula', rotulo: 'Fórmula' },
	{ id: 'exercicio', rotulo: 'Exercício' }
] as const;

// Formato de aula usado nas páginas (id + campos de exibição), independente do row do drizzle.
export type AulaUi = {
	id: number;
	apostilaId: number;
	titulo: string;
	descricao: string | null;
	secao: string | null;
	ordem: number;
};

// Agrupa aulas em seções preservando a ordem; aulas sem seção ficam no grupo "sem seção".
export function agruparPorSecao<T extends AulaUi>(aulas: T[]): { secao: string | null; aulas: T[] }[] {
	const grupos: { secao: string | null; aulas: T[] }[] = [];
	for (const aula of aulas) {
		const ultimo = grupos[grupos.length - 1];
		if (ultimo && ultimo.secao === aula.secao) {
			ultimo.aulas.push(aula);
		} else {
			grupos.push({ secao: aula.secao, aulas: [aula] });
		}
	}
	return grupos;
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
	'exercicio'
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

export function ehBloco(valor: unknown): valor is Bloco {
	if (!valor || typeof valor !== 'object') return false;
	const b = valor as Record<string, unknown>;
	if (typeof b.id !== 'string' || b.id === '' || !TIPOS_VALIDOS.has(b.tipo as Bloco['tipo'])) return false;
	switch (b.tipo) {
		case 'titulo':
			return (
				typeof b.texto === 'string' &&
				typeof b.nivel === 'number' &&
				Number.isInteger(b.nivel) &&
				[1, 2, 3].includes(b.nivel)
			);
		case 'texto':
			return typeof b.conteudo === 'string';
		case 'codigo':
			return typeof b.codigo === 'string' && typeof b.linguagem === 'string';
		case 'mermaid':
			return typeof b.diagrama === 'string';
		case 'imagem':
			return typeof b.src === 'string' && (b.legenda === undefined || typeof b.legenda === 'string');
		case 'link':
			if (typeof b.rotulo !== 'string' || !TIPOS_LINK.has(b.tipoLink as BlocoLink['tipoLink'])) {
				return false;
			}
			return b.tipoLink === 'aula'
				? typeof b.aulaId === 'number' && Number.isInteger(b.aulaId) && b.aulaId > 0
				: ehUrlSegura(b.url);
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
			return (
				typeof b.pergunta === 'string' &&
				Array.isArray(b.alternativas) &&
				b.alternativas.length >= 2 &&
				b.alternativas.every((a) => typeof a === 'string') &&
				typeof b.correta === 'number' &&
				Number.isInteger(b.correta) &&
				b.correta >= 0 &&
				b.correta < b.alternativas.length &&
				(b.explicacao === undefined || b.explicacao === null || typeof b.explicacao === 'string')
			);
	}
	return false;
}

// Sanitiza blocos vindos de um POST (nunca confie no JSON bruto do cliente).
export function normalizarBlocos(valor: unknown): Blocos {
	if (!Array.isArray(valor)) return [];
	return valor.filter(ehBloco).map(normalizarCamposBloco);
}

// Garante campos opcionais com valores seguros por tipo.
function normalizarCamposBloco(bloco: Bloco): Bloco {
	switch (bloco.tipo) {
		case 'tabela':
			return {
				id: bloco.id,
				tipo: 'tabela',
				cabecalho: bloco.cabecalho.map((c) => String(c)),
				linhas: bloco.linhas.map((l) => l.map((c) => String(c)))
			};
		case 'formula':
			return { id: bloco.id, tipo: 'formula', latex: bloco.latex, destaque: bloco.destaque !== false };
		case 'exercicio':
			return {
				id: bloco.id,
				tipo: 'exercicio',
				pergunta: bloco.pergunta,
				alternativas: bloco.alternativas.map((a) => String(a)),
				correta: Number(bloco.correta) || 0,
				explicacao: typeof bloco.explicacao === 'string' ? bloco.explicacao : undefined
			};
		default:
			return bloco;
	}
}