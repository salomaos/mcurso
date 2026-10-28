// Quiz estilo Kahoot. Módulo client-safe: tipos, constantes, normalização das
// perguntas, pontuação e o parser de importação (colar um JSON da IA).
//
// As perguntas vivem como JSON na coluna `quizzes.perguntas`. Partidas, jogadores
// e ranking **não** são persistidos: só existem na sala em memória enquanto dura
// (`$lib/server/quiz-sala`).

export type PerguntaQuiz = {
	id: string;
	pergunta: string;
	alternativas: string[];
	/** Índice da alternativa certa em `alternativas`. */
	correta: number;
	/** Tempo da pergunta em segundos, com auto-avanço. */
	tempo: number;
};

export type Quiz = {
	id: number;
	titulo: string;
	descricao: string | null;
	perguntas: PerguntaQuiz[];
	createdAt: Date;
	updatedAt: Date;
};

// Formato de exibição da listagem: sem as perguntas inteiras, só a contagem.
export type QuizUi = {
	id: number;
	titulo: string;
	descricao: string | null;
	totalPerguntas: number;
	createdAt: Date;
	updatedAt: Date;
};

export const MIN_ALTERNATIVAS = 2;
export const MAX_ALTERNATIVAS = 4;
export const TEMPO_PADRAO = 20;
export const TEMPO_MIN = 5;
export const TEMPO_MAX = 120;
export const MAX_PERGUNTAS = 100;
export const LIMITE_TITULO = 120;
export const LIMITE_PERGUNTA = 300;
export const LIMITE_ALTERNATIVA = 160;

// Pontuação no estilo Kahoot: resposta certa vale entre metade e a base inteira,
// proporção ao tempo que sobrou. Errar ou não responder vale zero.
export const PONTOS_BASE = 1000;

// Quanto tempo o resultado da pergunta fica na tela antes de avançar sozinho
// para a próxima (ou para o ranking final).
export const ESPERA_REVELACAO_MS = 4000;

// Capacidade da sala e tamanho do código de acesso.
export const MAX_JOGADORES = 200;
export const TAMANHO_CODIGO = 6;

export function novoIdPergunta(): string {
	return crypto.randomUUID();
}

export function criarPergunta(): PerguntaQuiz {
	return {
		id: novoIdPergunta(),
		pergunta: '',
		alternativas: ['', ''],
		correta: 0,
		tempo: TEMPO_PADRAO
	};
}

// Rotas do quiz. O quiz em si só é editado; quem usa é a sala, que vive em
// `/quiz/host/[codigo]` (professor) e `/quiz/jogar/[codigo]` (aluno).
export function caminhoQuiz(quizId: number): string {
	return `/quiz/${quizId}`;
}

export function caminhoEditarQuiz(quizId: number): string {
	return `/quiz/${quizId}/editar`;
}

export function caminhoHost(codigo: string): string {
	return `/quiz/host/${codigo}`;
}

export function caminhoJogar(codigo?: string): string {
	return codigo ? `/quiz/jogar/${codigo}` : '/quiz/jogar';
}

export function ehTempoValido(valor: unknown): valor is number {
	return (
		typeof valor === 'number' &&
		Number.isInteger(valor) &&
		valor >= TEMPO_MIN &&
		valor <= TEMPO_MAX
	);
}

// Normaliza uma pergunta vinda de POST/DB/importação. Leniente de propósito: só
// descarta o que não dá para aproveitar (não é objeto ou pergunta sem texto).
// `correta` fora da faixa e `tempo` inválido caem no padrão — a validação
// (`validarPerguntas`) é quem cobra o que o professor precisa arrumar.
export function normalizarPergunta(valor: unknown): PerguntaQuiz | null {
	if (!valor || typeof valor !== 'object') return null;
	const bruto = valor as Record<string, unknown>;

	const pergunta = String(bruto.pergunta ?? '')
		.trim()
		.slice(0, LIMITE_PERGUNTA);
	if (!pergunta) return null;

	const alternativas = Array.isArray(bruto.alternativas)
		? bruto.alternativas
				.slice(0, MAX_ALTERNATIVAS)
				.map((alternativa) => String(alternativa ?? '').trim().slice(0, LIMITE_ALTERNATIVA))
		: [];

	const corretaBruta = Number(bruto.correta);
	const correta =
		Number.isInteger(corretaBruta) && corretaBruta >= 0 && corretaBruta < alternativas.length
			? corretaBruta
			: 0;

	const tempo = ehTempoValido(Number(bruto.tempo)) ? Number(bruto.tempo) : TEMPO_PADRAO;
	const id = typeof bruto.id === 'string' && bruto.id ? bruto.id : novoIdPergunta();

	return { id, pergunta, alternativas, correta, tempo };
}

export function normalizarPerguntas(valor: unknown): PerguntaQuiz[] {
	if (!Array.isArray(valor)) return [];
	return valor
		.map(normalizarPergunta)
		.filter((pergunta): pergunta is PerguntaQuiz => pergunta !== null)
		.slice(0, MAX_PERGUNTAS);
}

// Cobra o que a pergunta normalizada não consegue garantir sozinha. Devolve a
// primeira pendência encontrada (mensagem pronta para o alert do editor) ou null.
export function validarPerguntas(perguntas: PerguntaQuiz[]): string | null {
	if (perguntas.length === 0) return 'Adicione pelo menos uma pergunta ao quiz.';
	if (perguntas.length > MAX_PERGUNTAS) return `O quiz aceita no máximo ${MAX_PERGUNTAS} perguntas.`;

	for (const [indice, pergunta] of perguntas.entries()) {
		const numero = indice + 1;
		if (!pergunta.pergunta.trim()) return `A pergunta ${numero} está sem enunciado.`;
		if (pergunta.alternativas.length < MIN_ALTERNATIVAS) {
			return `A pergunta ${numero} precisa de pelo menos ${MIN_ALTERNATIVAS} alternativas.`;
		}
		if (pergunta.alternativas.some((alternativa) => !alternativa.trim())) {
			return `A pergunta ${numero} tem uma alternativa em branco.`;
		}
		if (pergunta.correta < 0 || pergunta.correta >= pergunta.alternativas.length) {
			return `A pergunta ${numero} está sem alternativa correta.`;
		}
		if (!ehTempoValido(pergunta.tempo)) {
			return `O tempo da pergunta ${numero} precisa ficar entre ${TEMPO_MIN} e ${TEMPO_MAX} segundos.`;
		}
	}

	return null;
}

// Pontuação de uma resposta. `tempoRespostaMs` é quanto o jogador levou; o
// limite vem do `tempo` da pergunta. Resposta errada não pontua.
export function pontosDaResposta(
	correta: boolean,
	tempoRespostaMs: number,
	tempoLimiteSeg: number
): number {
	if (!correta) return 0;
	const limite = Math.max(1, tempoLimiteSeg * 1000);
	const usados = Math.min(Math.max(tempoRespostaMs, 0), limite);
	const fracaoRestante = 1 - usados / limite;
	return Math.round(PONTOS_BASE * (0.5 + 0.5 * fracaoRestante));
}

export type LinhaRanking = {
	jogadorId: string;
	nome: string;
	pontuacao: number;
	posicao: number;
	/** Perguntas já resolvidas que o jogador acertou. */
	acertos: number;
	/** Perguntas já resolvidas que ele errou ou deixou em branco. */
	erros: number;
};

export type Pontuavel = {
	id: string;
	nome: string;
	pontuacao: number;
	acertos: number;
	erros: number;
};

// Ranking do fim/revelação: maior pontuação primeiro, nome como desempate. Quem
// empata divide a posição (1, 1, 3) — é o que o Kahoot faz e evita inventar uma
// ordem que a pontuação não sustenta.
export function calcularRanking(jogadores: Pontuavel[]): LinhaRanking[] {
	const ordenados = [...jogadores].sort(
		(a, b) => b.pontuacao - a.pontuacao || a.nome.localeCompare(b.nome, 'pt-BR')
	);

	let posicaoAnterior = 0;
	let pontuacaoAnterior = Number.NaN;
	return ordenados.map((jogador, indice) => {
		const posicao = jogador.pontuacao === pontuacaoAnterior ? posicaoAnterior : indice + 1;
		posicaoAnterior = posicao;
		pontuacaoAnterior = jogador.pontuacao;
		return {
			jogadorId: jogador.id,
			nome: jogador.nome,
			pontuacao: jogador.pontuacao,
			posicao,
			acertos: jogador.acertos,
			erros: jogador.erros
		};
	});
}

// --- Importação de estrutura pronta (JSON colado da IA) -------------------
//
// Aceita o objeto `{ titulo?, descricao?, perguntas: [...] }` ou um array de
// perguntas direto. Os nomes de campo variam muito entre modelos, então cada um
// tem apelidos. A alternativa também pode vir como objeto `{ texto, correta }`.

export type ImportacaoQuiz = {
	titulo?: string;
	descricao?: string;
	perguntas: PerguntaQuiz[];
};

function primeiroCampo(objeto: Record<string, unknown>, nomes: string[]): unknown {
	for (const nome of nomes) {
		if (objeto[nome] !== undefined && objeto[nome] !== null) return objeto[nome];
	}
	return undefined;
}

function alternativaDe(valor: unknown): { texto: string; correta: boolean } {
	if (valor && typeof valor === 'object') {
		const objeto = valor as Record<string, unknown>;
		const texto = String(
			primeiroCampo(objeto, ['texto', 'text', 'label', 'resposta', 'alternativa', 'value']) ?? ''
		).trim();
		const marca = primeiroCampo(objeto, ['correta', 'correct', 'certa', 'isCorrect', 'verdadeira']);
		return { texto, correta: marca === true || marca === 'true' || marca === 1 };
	}
	return { texto: String(valor ?? '').trim(), correta: false };
}

function perguntaDe(valor: unknown, indice: number): { pergunta: PerguntaQuiz } | { erro: string } {
	if (!valor || typeof valor !== 'object') {
		return { erro: `A pergunta ${indice + 1} do JSON não é um objeto.` };
	}
	const objeto = valor as Record<string, unknown>;

	const texto = String(
		primeiroCampo(objeto, ['pergunta', 'enunciado', 'titulo', 'questao', 'texto', 'text']) ?? ''
	).trim();
	if (!texto) return { erro: `A pergunta ${indice + 1} do JSON está sem enunciado.` };

	const cruas = primeiroCampo(objeto, ['alternativas', 'opcoes', 'options', 'respostas', 'choices']);
	if (!Array.isArray(cruas) || cruas.length < MIN_ALTERNATIVAS) {
		return { erro: `A pergunta ${indice + 1} do JSON precisa de pelo menos 2 alternativas.` };
	}
	const alternativas = cruas.slice(0, MAX_ALTERNATIVAS).map(alternativaDe);
	if (alternativas.some((alternativa) => !alternativa.texto)) {
		return { erro: `A pergunta ${indice + 1} do JSON tem uma alternativa em branco.` };
	}

	// O índice correto pode vir como número ou como texto da alternativa. Se as
	// alternativas vierem com a marca `correta`, é a marca que manda.
	let correta = alternativas.findIndex((alternativa) => alternativa.correta);
	if (correta < 0) {
		const cru = primeiroCampo(objeto, [
			'correta',
			'corretaIndice',
			'indiceCorreto',
			'respostaCorreta',
			'answer',
			'gabarito'
		]);
		if (typeof cru === 'number' && Number.isInteger(cru) && cru >= 0 && cru < alternativas.length) {
			correta = cru;
		} else if (typeof cru === 'string') {
			const procurado = cru.trim().toLowerCase();
			correta = alternativas.findIndex((alternativa) => alternativa.texto.toLowerCase() === procurado);
			if (correta < 0) {
				const numero = Number(cru);
				if (Number.isInteger(numero) && numero >= 0 && numero < alternativas.length) correta = numero;
			}
		}
	}
	if (correta < 0) {
		return { erro: `A pergunta ${indice + 1} do JSON não diz qual alternativa é a correta.` };
	}

	const tempoCru = Number(
		primeiroCampo(objeto, ['tempo', 'segundos', 'time', 'tempoSegundos', 'seconds']) ?? TEMPO_PADRAO
	);
	return {
		pergunta: {
			id: novoIdPergunta(),
			pergunta: texto.slice(0, LIMITE_PERGUNTA),
			alternativas: alternativas.map((alternativa) => alternativa.texto.slice(0, LIMITE_ALTERNATIVA)),
			correta,
			tempo: ehTempoValido(tempoCru) ? tempoCru : TEMPO_PADRAO
		}
	};
}

export function interpretarQuizImportado(texto: string): ImportacaoQuiz | { erro: string } {
	let bruto: unknown;
	try {
		bruto = JSON.parse(texto);
	} catch {
		return { erro: 'O texto colado não é um JSON válido.' };
	}

	const objeto = Array.isArray(bruto) ? {} : ((bruto ?? {}) as Record<string, unknown>);
	const cruas = Array.isArray(bruto)
		? bruto
		: primeiroCampo(objeto, ['perguntas', 'questions', 'questoes', 'items']);

	if (!Array.isArray(cruas)) {
		return { erro: 'O JSON precisa ser uma lista de perguntas ou um objeto com o campo "perguntas".' };
	}
	if (cruas.length === 0) {
		return { erro: 'O JSON não tem nenhuma pergunta.' };
	}
	if (cruas.length > MAX_PERGUNTAS) {
		return { erro: `O JSON tem mais de ${MAX_PERGUNTAS} perguntas.` };
	}

	const perguntas: PerguntaQuiz[] = [];
	for (const [indice, valor] of cruas.entries()) {
		const resultado = perguntaDe(valor, indice);
		if ('erro' in resultado) return resultado;
		perguntas.push(resultado.pergunta);
	}

	const titulo = primeiroCampo(objeto, ['titulo', 'title']);
	const descricao = primeiroCampo(objeto, ['descricao', 'description']);

	return {
		titulo: typeof titulo === 'string' ? titulo.trim().slice(0, LIMITE_TITULO) || undefined : undefined,
		descricao:
			typeof descricao === 'string' ? descricao.trim() || undefined : undefined,
		perguntas
	};
}

// --- Estado da partida (tempo real) ---------------------------------------
//
// As salas vivem em memória (`$lib/server/quiz-sala`), mas os tipos ficam aqui
// porque as páginas (cliente) importam este módulo. O que é serializado por
// polling é uma destas duas formas.

export type StatusSala = 'lobby' | 'pergunta' | 'revelacao' | 'fim';

export type PerguntaEmJogo = {
	numero: number;
	pergunta: string;
	alternativas: string[];
	tempo: number;
	/** Só vem preenchida a partir da revelação: durante a pergunta é null. */
	correta: number | null;
};

export type JogadorPublico = {
	id: string;
	nome: string;
	pontuacao: number;
	posicao: number;
};

export type EstadoQuizBase = {
	codigo: string;
	titulo: string;
	descricao: string | null;
	status: StatusSala;
	/** Professor fechou as entradas: só quem já está continua (partida segue). */
	encerrada: boolean;
	/** Pergunta atual (0-based); -1 no lobby. */
	indice: number;
	totalPerguntas: number;
	pergunta: PerguntaEmJogo | null;
	/** Instante (ms epoch) do início da fase, para o contador local do cliente. */
	faseInicio: number;
	/** Restante no servidor no momento desta resposta (ms). */
	tempoRestanteMs: number;
	totalJogadores: number;
	totalRespostas: number;
	/** Preenchido a partir da revelação; vazio durante a pergunta. */
	ranking: LinhaRanking[];
	atualizadaEm: number;
};

export type EstadoQuizHost = EstadoQuizBase & {
	papel: 'host';
	jogadores: JogadorPublico[];
};

export type EstadoQuizJogador = EstadoQuizBase & {
	papel: 'jogador';
	jogador: {
		id: string;
		nome: string;
		pontuacao: number;
		posicao: number;
		respondeu: boolean;
		/** Índice marcado, para destacar a alternativa; null se não respondeu. */
		escolhida: number | null;
		pontosNaPergunta: number;
		acertou: boolean;
	};
};

export type EstadoQuiz = EstadoQuizHost | EstadoQuizJogador;

// Exemplo mostrado no editor para orientar o formato aceito.
export const EXEMPLO_IMPORTACAO = `{
  "titulo": "Revisão de frações",
  "perguntas": [
    {
      "pergunta": "Quanto é 1/2 + 1/4?",
      "alternativas": ["1/6", "3/4", "2/6", "1/8"],
      "correta": 1,
      "tempo": 20
    }
  ]
}`;
