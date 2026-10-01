// Conteúdos de estudo: aulas (dentro de uma apostila, listadas nela), anexos
// (material de apoio solto) e atividades de exercícios (também soltas). Os três
// guardam blocos e compartilham o editor; a leitura da atividade é outra
// (runner com gabarito só no fim).

export const TIPOS_CONTEUDO = ['aula', 'anexo', 'exercicio'] as const;
export type TipoConteudo = (typeof TIPOS_CONTEUDO)[number];

export const ROTULO_TIPO: Record<TipoConteudo, string> = {
	aula: 'Aula',
	anexo: 'Anexo',
	exercicio: 'Atividade'
};

// Rótulos das ações de conteúdo. São **contrato de E2E**: o Playwright procura esses
// textos por nome, então mudar a string quebra a spec. São três de impressão, cada um
// no seu lugar: o link de contexto abre `/imprimir`, o botão de dentro da página de
// impressão é quem dispara `window.print()`, e o da tela de resultado do aluno imprime
// o cartão de nota.
export const ROTULO_EDITAR = 'Editar';
export const ROTULO_APRESENTAR = 'Apresentar';
export const ROTULO_IMPRIMIR = 'Imprimir/PDF';
export const ROTULO_IMPRIMIR_PAGINA = 'Imprimir / salvar PDF';
export const ROTULO_IMPRIMIR_RESULTADO = 'Imprimir / PDF';
export const ROTULO_VISUALIZAR = 'Visualizar';
export const ROTULO_RESPONDER_DE_NOVO = 'Responder de novo';

// Como o aluno responde a uma questão: uma alternativa verdadeira (`radio`) ou
// várias (`checkbox`). Vive aqui porque o payload público também precisa do
// campo, e `conteudo.ts` é o módulo client-safe compartilhado.
export const SELECOES_EXERCICIO = ['radio', 'checkbox'] as const;
export type SelecaoExercicio = (typeof SELECOES_EXERCICIO)[number];

export function caminhoAula(
	apostilaId: number,
	aulaId: number,
	sufixo = '',
	baseHref = '/apostilas'
) {
	return `${baseHref}/${apostilaId}/aulas/${aulaId}${sufixo}`;
}

// Anexo e atividade são soltos: a URL não leva apostila nenhuma.
export function caminhoAnexo(anexoId: number, sufixo = '') {
	return `/anexos/${anexoId}${sufixo}`;
}

export function caminhoExercicio(exercicioId: number, sufixo = '') {
	return `/exercicios/${exercicioId}${sufixo}`;
}

// De onde o conteúdo vem: aula vive dentro de uma apostila; anexo e atividade não
// têm dono.
export type ContextoConteudo =
	| { tipo: 'aula'; apostilaId: number; apostilaTitulo: string }
	| { tipo: 'anexo' }
	| { tipo: 'exercicio' };

// Rotas e contexto de renderização compartilhados pelas telas de aula/anexo.
export function rotasConteudo(
	contexto: ContextoConteudo,
	conteudoId: number,
	baseHref = '/apostilas'
) {
	if (contexto.tipo === 'anexo') {
		return {
			proprio: caminhoAnexo(conteudoId),
			voltar: { href: '/anexos', rotulo: 'Anexos' },
			apostilaId: undefined as number | undefined
		};
	}
	if (contexto.tipo === 'exercicio') {
		return {
			proprio: caminhoExercicio(conteudoId),
			voltar: { href: '/exercicios', rotulo: 'Atividades' },
			apostilaId: undefined as number | undefined
		};
	}
	return {
		proprio: caminhoAula(contexto.apostilaId, conteudoId, '', baseHref),
		voltar: { href: `${baseHref}/${contexto.apostilaId}`, rotulo: contexto.apostilaTitulo },
		apostilaId: contexto.apostilaId
	};
}

// Alvos do bloco de link: aulas da apostila atual, anexos soltos e atividades.
// `detalhe` é a linha de apoio na busca (descrição do alvo).
export type AlvoLink = { id: number; titulo: string; detalhe?: string | null };

// Tipos de alvo do bloco de link. `externo` não tem alvo interno, então não
// entra aqui: quem escolhe alvo é sempre um destes três.
export type TipoAlvo = 'aula' | 'anexo' | 'exercicio';

export const ROTULO_ALVO: Record<TipoAlvo, string> = {
	aula: 'Aula',
	anexo: 'Anexo',
	exercicio: 'Atividade'
};

// Aula que aponta para um anexo/atividade, usada nos links reversos das listagens.
export type ReferenciaAnexo = { id: number; titulo: string; apostilaId: number };

// Anexo na lista de /anexos, com as aulas que apontam para ele.
export type AnexoUi = {
	id: number;
	titulo: string;
	descricao: string | null;
	createdAt: Date;
	updatedAt: Date;
	referencias: ReferenciaAnexo[];
};

// Atividade na lista de /exercicios, com as aulas que apontam para ela.
export type ExercicioUi = {
	id: number;
	titulo: string;
	descricao: string | null;
	questoes: number;
	discursivas: number;
	createdAt: Date;
	updatedAt: Date;
	referencias: ReferenciaAnexo[];
};

// O que o aluno recebe na página pública: nunca `correta` nem `explicacao`,
// senão o gabarito vaza no HTML antes do POST.
export type QuestaoPublica = {
	id: string;
	pergunta: string;
	alternativas: string[];
	/**radio = uma alternativa verdadeira; checkbox = várias. */
	selecao: SelecaoExercicio;
};

// Dissertativa pública: o enunciado vai, o gabarito não existe (a correção é
// manual) e a resposta do aluno volta no resultado.
export type DissertativaPublica = {
	id: string;
	pergunta: string;
	orientacao?: string;
};

// Questão corrigida no servidor, devolvida no resultado (aqui o gabarito pode
// aparecer: a resposta já foi dada). `escolhida`/`correta` são listas para as
// duas modalidades caberem no mesmo formato: `radio` nunca passa de um item.
export type CorrecaoQuestao = {
	id: string;
	pergunta: string;
	selecao: SelecaoExercicio;
	/** alternativas marcadas pelo aluno; vazia = deixou em branco */
	escolhida: number[];
	correta: number[];
	acertou: boolean;
	alternativas: string[];
	explicacao?: string;
};

// Resposta aberta: aparece no resultado para avaliação, fora da nota automática.
export type CorrecaoDissertativa = {
	id: string;
	pergunta: string;
	orientacao?: string;
	resposta: string;
};

export type Correcao = {
	questoes: CorrecaoQuestao[];
	dissertativas: CorrecaoDissertativa[];
	acertos: number;
	total: number;
};
