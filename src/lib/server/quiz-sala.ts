// Salas de quiz em memória — a partida inteira (jogadores, respostas, fases e
// ranking) vive aqui e **nunca** vai para o banco. O polling de ~1s chama
// `avancarSala` a cada leitura, então o tempo (auto-avanço) é resolvido de forma
// preguiçosa: não existe timer de fundo.
//
// Processo único (adapter-node). Se o servidor reiniciar, as salas somem — o que
// é aceitável: nada de partida é persistido de propósito. Por isso cada evento de
// sala (criar, entrar, trocar de fase, encerrar, remover, expirar) gera um log e
// um heartbeat por minuto lista as salas ativas: é o que permite distinguir, no
// painel da hospedagem, "o processo reiniciou" (as linhas param e o log de boot
// volta) de "o bloqueio veio do servidor web" (as linhas param sem boot e sem
// erro nenhum — a request não chegou no app).
//
// O armazenamento fica pendurado em `globalThis` para sobreviver ao hot reload do
// Vite em dev (o módulo é reavaliado, mas as salas abertas continuam). O timer do
// heartbeat leva a mesma guarda, senão cada recarga em dev empilharia intervalo.

import {
	calcularRanking,
	ESPERA_REVELACAO_MS,
	MAX_JOGADORES,
	pontosDaResposta,
	TAMANHO_CODIGO,
	type EstadoQuizHost,
	type EstadoQuizJogador,
	type JogadorPublico,
	type LinhaRanking,
	type PerguntaEmJogo,
	type PerguntaQuiz,
	type Quiz,
	type StatusSala
} from '$lib/quiz';
import { log } from '$lib/server/log';

export const NOME_MAX = 40;

type Jogador = { id: string; nome: string; pontuacao: number; acertos: number; entrouEm: number };

type Resposta = { indice: number; tempoMs: number; pontos: number; correta: boolean };

type Sala = {
	codigo: string;
	quizId: number;
	titulo: string;
	descricao: string | null;
	perguntas: PerguntaQuiz[];
	status: StatusSala;
	/** Professor fechou as entradas. A partida segue para quem já está. */
	encerrada: boolean;
	/** Pergunta atual (0-based); -1 no lobby. */
	indice: number;
	faseInicio: number;
	jogadores: Map<string, Jogador>;
	respostas: Map<string, Resposta>;
	criadaEm: number;
	atualizadaEm: number;
};

export type ResultadoJogador = { id: string; nome: string } | { erro: string };

const armazem = globalThis as unknown as { __mcursoQuizSalas?: Map<string, Sala> };
const SALAS = (armazem.__mcursoQuizSalas ??= new Map<string, Sala>());

// Sem O/0/I/1: o código é lido em voz alta e digitado no celular.
const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Salas em andamento sem movimento por 6h são descartadas (na criação da
// próxima e a cada batida do heartbeat), para a memória não crescer para
// sempre num servidor que fica de pé por dias. Finalizada ("fim"), a sala só
// existia para mostrar o ranking — quem estava na tela já viu: 30 min e some.
const VALIDADE_SALA_MS = 6 * 60 * 60 * 1000;
const VALIDADE_FIM_MS = 30 * 60 * 1000;

// Uma linha por sala ativa a cada minuto — ver comentário de topo. `unref()`
// para o timer não segurar o processo aberto. Sala finalizada ("fim") não loga:
// o ranking já foi visto por quem estava na tela; a expiração curta cuida dela,
// então o heartbeat não precisa ficar batendo (e poluindo o log) por horas.
const HEARTBEAT_SALA_MS = 60 * 1000;
const guardaHeartbeat = globalThis as unknown as { __mcursoQuizHeartbeat?: boolean };
if (!guardaHeartbeat.__mcursoQuizHeartbeat) {
	guardaHeartbeat.__mcursoQuizHeartbeat = true;
	const timer = setInterval(() => {
		const agora = Date.now();
		limparAntigas(agora);
		for (const sala of SALAS.values()) {
			if (sala.status === 'fim') continue;
			log.info(
				`quiz: heartbeat sala ${sala.codigo} — ${sala.status}, ` +
					`${sala.jogadores.size} jogador(es), ${sala.respostas.size} resposta(s), ` +
					`${Math.round((agora - sala.criadaEm) / 60000)}min de sala`
			);
		}
	}, HEARTBEAT_SALA_MS);
	timer.unref();
}

function gerarCodigo(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(TAMANHO_CODIGO));
	let codigo = '';
	for (const byte of bytes) codigo += ALFABETO_CODIGO[byte % ALFABETO_CODIGO.length];
	return codigo;
}

function limparAntigas(agora: number) {
	let removidas = 0;
	for (const [codigo, sala] of SALAS) {
		const validade = sala.status === 'fim' ? VALIDADE_FIM_MS : VALIDADE_SALA_MS;
		if (agora - sala.atualizadaEm > validade) {
			SALAS.delete(codigo);
			removidas += 1;
		}
	}
	if (removidas > 0) log.info(`quiz: ${removidas} sala(s) expirada(s) removida(s)`);
}

export function normalizarCodigo(valor: string): string {
	return valor.trim().toUpperCase();
}

export function criarSala(quiz: Quiz): Sala {
	const agora = Date.now();
	limparAntigas(agora);

	let codigo = gerarCodigo();
	while (SALAS.has(codigo)) codigo = gerarCodigo();

	const sala: Sala = {
		codigo,
		quizId: quiz.id,
		titulo: quiz.titulo,
		descricao: quiz.descricao,
		perguntas: quiz.perguntas,
		status: 'lobby',
		encerrada: false,
		indice: -1,
		faseInicio: agora,
		jogadores: new Map(),
		respostas: new Map(),
		criadaEm: agora,
		atualizadaEm: agora
	};
	SALAS.set(codigo, sala);
	log.info(
		`quiz: sala ${codigo} criada — "${quiz.titulo}" (${quiz.perguntas.length} pergunta(s), ${SALAS.size} sala(s) ativa(s))`
	);
	return sala;
}

export function buscarSala(codigoBruto: string): Sala | undefined {
	return SALAS.get(normalizarCodigo(codigoBruto));
}

export function entrarSala(codigoBruto: string, nomeBruto: string): ResultadoJogador {
	const sala = buscarSala(codigoBruto);
	if (!sala) return { erro: 'Sala não encontrada. Confira o código com o professor.' };
	// Encerrada pelo professor ou no fim natural: não entra ninguém novo.
	if (sala.encerrada || sala.status === 'fim') {
		return { erro: 'Este quiz já foi encerrado. Peça outro código.' };
	}
	if (sala.status !== 'lobby') return { erro: 'Esta partida já começou. Peça um novo código.' };

	const nome = String(nomeBruto ?? '')
		.trim()
		.slice(0, NOME_MAX);
	if (!nome) return { erro: 'Informe seu nome para entrar.' };
	if (sala.jogadores.size >= MAX_JOGADORES) return { erro: 'A sala está cheia.' };

	const jogador: Jogador = {
		id: crypto.randomUUID(),
		nome,
		pontuacao: 0,
		acertos: 0,
		entrouEm: Date.now()
	};
	sala.jogadores.set(jogador.id, jogador);
	sala.atualizadaEm = Date.now();
	log.info(`quiz: ${jogador.nome} entrou na sala ${sala.codigo} (${sala.jogadores.size} jogador(es))`);
	return { id: jogador.id, nome: jogador.nome };
}

export function iniciarSala(sala: Sala): { erro?: string } {
	if (sala.status !== 'lobby') return { erro: 'A partida já foi iniciada.' };
	if (sala.perguntas.length === 0) return { erro: 'O quiz não tem perguntas.' };
	sala.status = 'pergunta';
	sala.indice = 0;
	sala.faseInicio = Date.now();
	sala.respostas.clear();
	sala.atualizadaEm = Date.now();
	log.info(`quiz: sala ${sala.codigo} iniciada — ${sala.jogadores.size} jogador(es), ${sala.perguntas.length} pergunta(s)`);
	return {};
}

// Resolve as transições por tempo: pergunta → revelação (quando o tempo acaba
// ou todos responderam) e revelação → próxima pergunta (depois da espera). É
// chamada a cada leitura (polling) e antes de aceitar resposta, então uma
// resposta atrasada vê a fase já sincronizada e é recusada.
export function avancarSala(sala: Sala, agora = Date.now()): boolean {
	let mudou = false;

	if (sala.status === 'pergunta') {
		const pergunta = sala.perguntas[sala.indice];
		const acabou = agora - sala.faseInicio >= pergunta.tempo * 1000;
		const todos = sala.jogadores.size > 0 && sala.respostas.size >= sala.jogadores.size;
		if (acabou || todos) {
			sala.status = 'revelacao';
			sala.faseInicio = agora;
			mudou = true;
			log.info(
				`quiz: sala ${sala.codigo} pergunta ${sala.indice + 1}/${sala.perguntas.length} → revelação (${todos ? 'todos responderam' : 'tempo esgotado'})`
			);
		}
	} else if (sala.status === 'revelacao') {
		if (agora - sala.faseInicio >= ESPERA_REVELACAO_MS) {
			proximaPergunta(sala, agora);
			mudou = true;
			log.info(`quiz: sala ${sala.codigo} ${rotuloRevelacaoPara(sala)} (tempo de espera)`);
		}
	}

	if (mudou) sala.atualizadaEm = agora;
	return mudou;
}

function proximaPergunta(sala: Sala, agora: number) {
	sala.indice += 1;
	sala.respostas.clear();
	sala.faseInicio = agora;
	sala.status = sala.indice >= sala.perguntas.length ? 'fim' : 'pergunta';
}

// "revelação → X" com X = "fim" ou a próxima pergunta (1-based, já com o índice
// atualizado por `proximaPergunta`).
function rotuloRevelacaoPara(sala: Sala): string {
	return sala.status === 'fim'
		? 'revelação → fim'
		: `revelação → pergunta ${sala.indice + 1}/${sala.perguntas.length}`;
}

// Controle manual do professor: adianta a fase (encerra a pergunta ou pula a
// revelação). No lobby não faz nada: quem começa é o `iniciarSala`.
export function proximaEtapa(sala: Sala): { erro?: string } {
	if (sala.status === 'pergunta') {
		sala.status = 'revelacao';
		sala.faseInicio = Date.now();
		log.info(`quiz: sala ${sala.codigo} pergunta ${sala.indice + 1}/${sala.perguntas.length} → revelação (professor)`);
	} else if (sala.status === 'revelacao') {
		proximaPergunta(sala, Date.now());
		log.info(`quiz: sala ${sala.codigo} ${rotuloRevelacaoPara(sala)} (professor)`);
	} else {
		return { erro: 'Nada para avançar agora.' };
	}
	sala.atualizadaEm = Date.now();
	return {};
}

// "Encerrar o quiz": fecha as entradas. A partida segue normal para quem já está
// na sala — o auto-avanço continua, o ranking sai no fim. Novo código na tela
// de entrada é recusado ("já foi encerrado"), mas ninguém presente é desconectado.
export function encerrarSala(sala: Sala): { erro?: string } {
	if (sala.encerrada || sala.status === 'fim') return { erro: 'A sala já está encerrada.' };
	sala.encerrada = true;
	sala.atualizadaEm = Date.now();
	log.info(`quiz: sala ${sala.codigo} encerrada — entradas fechadas, a partida segue para quem está`);
	return {};
}

// "Sair e remover todos": apaga a sala da memória na hora. O código deixa de
// existir e o próximo polling de qualquer aluno recebe 404.
export function removerSala(codigoBruto: string) {
	const codigo = normalizarCodigo(codigoBruto);
	SALAS.delete(codigo);
	log.info(`quiz: sala ${codigo} removida pelo professor`);
}

export type ResultadoResposta = { ok: true; correta: boolean; pontos: number } | { erro: string };

export function responder(sala: Sala, jogadorId: string, indice: number): ResultadoResposta {
	avancarSala(sala, Date.now());

	if (sala.status !== 'pergunta') return { erro: 'A pergunta não está mais aberta.' };
	const jogador = sala.jogadores.get(jogadorId);
	if (!jogador) return { erro: 'Você não está nesta sala.' };
	if (sala.respostas.has(jogadorId)) return { erro: 'Você já respondeu esta pergunta.' };

	const pergunta = sala.perguntas[sala.indice];
	if (!Number.isInteger(indice) || indice < 0 || indice >= pergunta.alternativas.length) {
		return { erro: 'Alternativa inválida.' };
	}

	const agora = Date.now();
	const tempoMs = Math.max(0, agora - sala.faseInicio);
	const correta = indice === pergunta.correta;
	const pontos = pontosDaResposta(correta, tempoMs, pergunta.tempo);

	jogador.pontuacao += pontos;
	if (correta) jogador.acertos += 1;
	sala.respostas.set(jogadorId, { indice, tempoMs, pontos, correta });
	sala.atualizadaEm = agora;

	// Todos responderam: não espera o relógio acabar. A transição é feita aqui
	// (não passa pelo `avancarSala`), então o log repete o mesmo rótulo de lá.
	if (sala.jogadores.size > 0 && sala.respostas.size >= sala.jogadores.size) {
		sala.status = 'revelacao';
		sala.faseInicio = agora;
		log.info(
			`quiz: sala ${sala.codigo} pergunta ${sala.indice + 1}/${sala.perguntas.length} → revelação (todos responderam)`
		);
	}

	return { ok: true, correta, pontos };
}

// --- Projeções para o polling ---------------------------------------------

// Perguntas cujo resultado já existe (a que está em jogo só conta quando vira
// revelação; no fim contam todas). É o que fecha a conta `acertos + erros`.
function perguntasResolvidas(sala: Sala): number {
	if (sala.status === 'lobby') return 0;
	if (sala.status === 'pergunta') return sala.indice;
	return Math.min(sala.perguntas.length, sala.indice + 1);
}

function listaJogadores(sala: Sala): JogadorPublico[] {
	const posicoes = new Map(ranking(sala).map((linha) => [linha.jogadorId, linha.posicao]));
	return [...sala.jogadores.values()].map((jogador) => ({
		id: jogador.id,
		nome: jogador.nome,
		pontuacao: jogador.pontuacao,
		posicao: posicoes.get(jogador.id) ?? 0
	}));
}

// Deixar a pergunta em branco conta como erro: `acertos + erros` é sempre o
// número de perguntas já resolvidas.
function ranking(sala: Sala): LinhaRanking[] {
	const resolvidas = perguntasResolvidas(sala);
	return calcularRanking(
		[...sala.jogadores.values()].map((jogador) => ({
			id: jogador.id,
			nome: jogador.nome,
			pontuacao: jogador.pontuacao,
			acertos: jogador.acertos,
			erros: resolvidas - jogador.acertos
		}))
	);
}

function destacaCorreta(sala: Sala): boolean {
	return sala.status === 'revelacao' || sala.status === 'fim';
}

function perguntaEmJogo(sala: Sala): PerguntaEmJogo | null {
	if (sala.indice < 0 || sala.indice >= sala.perguntas.length) return null;
	const pergunta = sala.perguntas[sala.indice];
	return {
		numero: sala.indice + 1,
		pergunta: pergunta.pergunta,
		alternativas: pergunta.alternativas,
		tempo: pergunta.tempo,
		correta: destacaCorreta(sala) ? pergunta.correta : null
	};
}

function tempoRestanteMs(sala: Sala, agora: number): number {
	if (sala.status !== 'pergunta') return 0;
	const pergunta = sala.perguntas[sala.indice];
	return Math.max(0, pergunta.tempo * 1000 - (agora - sala.faseInicio));
}

function base(sala: Sala, agora: number) {
	return {
		codigo: sala.codigo,
		titulo: sala.titulo,
		descricao: sala.descricao,
		status: sala.status,
		encerrada: sala.encerrada,
		indice: sala.indice,
		totalPerguntas: sala.perguntas.length,
		pergunta: perguntaEmJogo(sala),
		faseInicio: sala.faseInicio,
		tempoRestanteMs: tempoRestanteMs(sala, agora),
		totalJogadores: sala.jogadores.size,
		totalRespostas: sala.respostas.size,
		ranking: destacaCorreta(sala) ? ranking(sala) : [],
		atualizadaEm: sala.atualizadaEm
	};
}

export function estadoHost(sala: Sala, agora = Date.now()): EstadoQuizHost {
	return { ...base(sala, agora), papel: 'host', jogadores: listaJogadores(sala) };
}

export function estadoJogador(sala: Sala, jogadorId: string, agora = Date.now()): EstadoQuizJogador | null {
	const jogador = sala.jogadores.get(jogadorId);
	if (!jogador) return null;

	const resposta = sala.respostas.get(jogadorId);
	const posicao = ranking(sala).find((linha) => linha.jogadorId === jogadorId)?.posicao ?? 0;

	return {
		...base(sala, agora),
		papel: 'jogador',
		jogador: {
			id: jogador.id,
			nome: jogador.nome,
			pontuacao: jogador.pontuacao,
			posicao,
			respondeu: Boolean(resposta),
			escolhida: resposta?.indice ?? null,
			pontosNaPergunta: resposta?.pontos ?? 0,
			acertou: resposta?.correta ?? false
		}
	};
}
