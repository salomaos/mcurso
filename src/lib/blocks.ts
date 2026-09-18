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

export type Bloco = BlocoTexto | BlocoTitulo | BlocoCodigo | BlocoMermaid | BlocoImagem | BlocoLink;
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
	}
}

export const TIPOS_BLOCO = [
	{ id: 'titulo', rotulo: 'Título' },
	{ id: 'texto', rotulo: 'Texto' },
	{ id: 'codigo', rotulo: 'Código' },
	{ id: 'mermaid', rotulo: 'Diagrama' },
	{ id: 'imagem', rotulo: 'Imagem' },
	{ id: 'link', rotulo: 'Link' }
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

const TIPOS_VALIDOS = new Set<Bloco['tipo']>(['titulo', 'texto', 'codigo', 'mermaid', 'imagem', 'link']);

export function ehBloco(valor: unknown): valor is Bloco {
	if (!valor || typeof valor !== 'object') return false;
	const b = valor as Record<string, unknown>;
	return typeof b.id === 'string' && TIPOS_VALIDOS.has(b.tipo as Bloco['tipo']);
}

// Sanitiza blocos vindos de um POST (nunca confie no JSON bruto do cliente).
export function normalizarBlocos(valor: unknown): Blocos {
	return Array.isArray(valor) ? valor.filter(ehBloco) : [];
}