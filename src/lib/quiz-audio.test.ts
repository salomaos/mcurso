import { describe, expect, it } from 'vitest';
import {
	CHAVE_MUDO_QUIZ,
	FAIXAS_QUIZ,
	JINGLES_QUIZ,
	TrilhaQuiz,
	VOLUME_JINGLE,
	VOLUME_TRILHA,
	faixaParaFase,
	jingleDaRevelacao,
	mudoSalvo
} from './quiz-audio';

describe('trilha sonora do quiz', () => {
	it('cada fase tem sua faixa e a revelação fica sem música', () => {
		expect(faixaParaFase('lobby')).toBe(`/audio/quiz/${FAIXAS_QUIZ.lobby}`);
		expect(faixaParaFase('pergunta')).toBe(`/audio/quiz/${FAIXAS_QUIZ.pergunta}`);
		expect(faixaParaFase('fim')).toBe(`/audio/quiz/${FAIXAS_QUIZ.podio}`);
		expect(faixaParaFase('revelacao')).toBeNull();
	});

	it('jingle da revelação reflete o acerto do jogador', () => {
		expect(jingleDaRevelacao(true)).toBe('acerto');
		expect(jingleDaRevelacao(false)).toBe('erro');
	});

	it('todo jingle tem um arquivo mp3', () => {
		for (const nome of ['acerto', 'erro', 'revelacao'] as const) {
			expect(JINGLES_QUIZ[nome]).toMatch(/\.mp3$/);
		}
	});

	it('volumes dentro da faixa audível', () => {
		for (const volume of [VOLUME_TRILHA, VOLUME_JINGLE]) {
			expect(volume).toBeGreaterThan(0);
			expect(volume).toBeLessThanOrEqual(1);
		}
	});

	it('fora do browser o mudo nunca está salvo', () => {
		expect(mudoSalvo()).toBe(false);
		expect(CHAVE_MUDO_QUIZ).toBe('mcurso:quiz-audio:mudo');
	});

	it('o motor inteiro vira no-op sem AudioContext (SSR/unit)', async () => {
		const trilha = new TrilhaQuiz();
		await trilha.destravar();
		await trilha.tocarFaixa(faixaParaFase('lobby'));
		await trilha.tocarFaixa(faixaParaFase('revelacao'));
		await trilha.tocarFaixa(null);
		await trilha.tocarJingle('acerto');
		await trilha.tocarJingle('erro');
		trilha.parar();
		expect(trilha.alternarMudo()).toBe(true);
		expect(trilha.alternarMudo()).toBe(false);
	});
});
