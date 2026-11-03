// Trilha sonora do quiz (estilo Kahoot), por fase da sala. Módulo client-safe:
// nada de DOM é tocado no import — o motor só opera depois de `destravar()`,
// que precisa ser chamada a partir de um gesto do usuário (política de
// autoplay dos browsers).
//
// Todos os arquivos vivem em `static/audio/quiz/` e são fornecidos à mão
// (nada é gerado nem baixado pelo app) — a lista completa está no README. Uma
// faixa ausente só deixa a sala em silêncio naquele momento — nunca quebra a
// página.

import type { StatusSala } from '$lib/quiz';

export const PASTA_AUDIO_QUIZ = '/audio/quiz';

// Uma faixa de fundo em loop por fase; a troca acontece sozinha conforme o
// polling atualiza o `status` da sala. A revelação fica sem música: entram só
// os jingles.
export const FAIXAS_QUIZ = {
	lobby: 'lobby.mp3',
	pergunta: 'pergunta.mp3',
	podio: 'podio.mp3'
} as const;

export type NomeJingle = 'acerto' | 'erro' | 'revelacao';

export const JINGLES_QUIZ: Record<NomeJingle, string> = {
	acerto: 'acerto.mp3',
	erro: 'erro.mp3',
	revelacao: 'revelacao.mp3'
};

export const CHAVE_MUDO_QUIZ = 'mcurso:quiz-audio:mudo';
export const VOLUME_TRILHA = 0.55;
export const VOLUME_JINGLE = 0.9;

export function caminhoAudioQuiz(arquivo: string): string {
	return `${PASTA_AUDIO_QUIZ}/${arquivo}`;
}

export function faixaParaFase(status: StatusSala): string | null {
	switch (status) {
		case 'lobby':
			return caminhoAudioQuiz(FAIXAS_QUIZ.lobby);
		case 'pergunta':
			return caminhoAudioQuiz(FAIXAS_QUIZ.pergunta);
		case 'fim':
			return caminhoAudioQuiz(FAIXAS_QUIZ.podio);
		case 'revelacao':
			return null;
	}
}

export function jingleDaRevelacao(acertou: boolean): NomeJingle {
	return acertou ? 'acerto' : 'erro';
}

function armazenamentoLocal(): Storage | null {
	return typeof localStorage === 'undefined' ? null : localStorage;
}

export function mudoSalvo(): boolean {
	return armazenamentoLocal()?.getItem(CHAVE_MUDO_QUIZ) === '1';
}

// Motor de reprodução: uma instância por página (host e jogar), criada no
// `onMount`. Todos os métodos são seguros antes de `destravar()` e fora do
// browser (SSR/testes), virando no-op. O loop é gapless por construir o
// `AudioBufferSourceNode` com `loop = true` (HTMLAudioElement pisca no restart).
export class TrilhaQuiz {
	private contexto: AudioContext | null = null;
	private mudoGeral: GainNode | null = null;
	private fonteAtual: AudioBufferSourceNode | null = null;
	private faixaAtual: string | null = null;
	private readonly buffers = new Map<string, Promise<AudioBuffer>>();

	mudo = false;

	constructor() {
		this.mudo = mudoSalvo();
	}

	// Cria o AudioContext e o ganho geral. Só toca se for chamada dentro de um
	// gesto do usuário (pointerdown/keydown) — é a trava de autoplay. Idempotente.
	async destravar(): Promise<void> {
		if (typeof AudioContext === 'undefined') return;
		if (this.contexto) {
			await this.contexto.resume();
			return;
		}
		this.contexto = new AudioContext();
		this.mudoGeral = this.contexto.createGain();
		this.mudoGeral.gain.value = this.mudo ? 0 : 1;
		this.mudoGeral.connect(this.contexto.destination);
		await this.contexto.resume();
	}

	// Toca a faixa da fase em loop; `null` (revelação) só para a atual. Pedir a
	// mesma faixa de novo é no-op, para o polling não reiniciar o loop.
	async tocarFaixa(caminho: string | null): Promise<void> {
		if (!this.contexto || !this.mudoGeral || caminho === this.faixaAtual) return;
		this.parar();
		this.faixaAtual = caminho;
		if (!caminho) return;
		try {
			const buffer = await this.buffer(caminho);
			// Enquanto o fetch/decodificação corriam, a fase pode ter trocado.
			if (this.faixaAtual !== caminho || !this.contexto) return;
			this.fonteAtual = this.tocarBuffer(buffer, VOLUME_TRILHA, true);
		} catch {
			// Faixa faltando: silêncio, sem erro na página.
		}
	}

	// Jingle único (acerto/erro/revelação), por cima da faixa da fase.
	async tocarJingle(nome: NomeJingle): Promise<void> {
		if (!this.contexto || !this.mudoGeral) return;
		try {
			const buffer = await this.buffer(caminhoAudioQuiz(JINGLES_QUIZ[nome]));
			if (!this.contexto) return;
			this.tocarBuffer(buffer, VOLUME_JINGLE, false);
		} catch {
			// Idem: jingle ausente não pode derrubar a página.
		}
	}

	parar(): void {
		if (this.fonteAtual) {
			try {
				this.fonteAtual.stop();
			} catch {
				// Fonte que ainda não tinha dado `start()`: nada a parar.
			}
			this.fonteAtual = null;
		}
		this.faixaAtual = null;
	}

	alternarMudo(): boolean {
		this.mudo = !this.mudo;
		armazenamentoLocal()?.setItem(CHAVE_MUDO_QUIZ, this.mudo ? '1' : '0');
		if (this.mudoGeral) this.mudoGeral.gain.value = this.mudo ? 0 : 1;
		return this.mudo;
	}

	private tocarBuffer(buffer: AudioBuffer, volume: number, loop: boolean): AudioBufferSourceNode {
		const fonte = this.contexto!.createBufferSource();
		const ganho = this.contexto!.createGain();
		fonte.buffer = buffer;
		fonte.loop = loop;
		ganho.gain.value = volume;
		fonte.connect(ganho);
		ganho.connect(this.mudoGeral!);
		fonte.start();
		return fonte;
	}

	private buffer(caminho: string): Promise<AudioBuffer> {
		let promessa = this.buffers.get(caminho);
		if (!promessa) {
			promessa = fetch(caminho)
				.then((resposta) => {
					if (!resposta.ok) throw new Error(`faixa ${caminho} não encontrada`);
					return resposta.arrayBuffer();
				})
				.then((dados) => this.contexto!.decodeAudioData(dados));
			this.buffers.set(caminho, promessa);
			// Falha não pode ficar cacheada para sempre: deixa tentar de novo.
			promessa.catch(() => this.buffers.delete(caminho));
		}
		return promessa;
	}
}
