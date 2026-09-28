import { describe, it, expect } from 'vitest';
import { normalizarBlocos, type Blocos } from './blocks';
import { corrigirExercicio, LIMITE_DISSERTATIVA, questoesPublicas } from './corrigir';

function questao(id: string, correta: number | number[], selecao?: 'radio' | 'checkbox') {
	return {
		id,
		tipo: 'exercicio' as const,
		pergunta: `Pergunta ${id}`,
		alternativas: ['a', 'b', 'c'],
		selecao,
		correta,
		explicacao: undefined as string | undefined
	};
}

function form(entradas: Record<string, string | string[]>) {
	const dados = new FormData();
	for (const [campo, valor] of Object.entries(entradas)) {
		for (const item of Array.isArray(valor) ? valor : [valor]) dados.append(campo, item);
	}
	return dados;
}

const blocos = normalizarBlocos([
	{ id: 'titulo', tipo: 'titulo', texto: 'Atividade', nivel: 1 },
	questao('q1', 1, 'radio'),
	questao('q2', 2, 'radio')
]);

describe('corrigirExercicio', () => {
	it('conta acertos e devolve gabarito e explicação por questão', () => {
		const correcao = corrigirExercicio(blocos, form({ q_q1: '1', q_q2: '0' }));

		expect(correcao.total).toBe(2);
		expect(correcao.acertos).toBe(1);
		expect(correcao.questoes[0]).toMatchObject({
			id: 'q1',
			selecao: 'radio',
			escolhida: [1],
			correta: [1],
			acertou: true
		});
		expect(correcao.questoes[1]).toMatchObject({ id: 'q2', escolhida: [0], acertou: false });
	});

	it('ignora blocos de apoio e só corrige blocos de exercício', () => {
		const correcao = corrigirExercicio(blocos, form({}));
		expect(correcao.total).toBe(2);
	});

	it('trata resposta em branco como errada, sem quebrar', () => {
		const correcao = corrigirExercicio(blocos, form({ q_q1: '' }));
		expect(correcao.questoes[0].escolhida).toEqual([]);
		expect(correcao.questoes[0].acertou).toBe(false);
		expect(correcao.acertos).toBe(0);
	});

	it('descarta índice fora da faixa em vez de aceitar resposta inventada', () => {
		expect(corrigirExercicio(blocos, form({ q_q1: '9' })).questoes[0].escolhida).toEqual([]);
		expect(corrigirExercicio(blocos, form({ q_q1: '-1' })).questoes[0].escolhida).toEqual([]);
		expect(corrigirExercicio(blocos, form({ q_q1: 'x' })).questoes[0].escolhida).toEqual([]);
	});

	it('devolve zero questões quando a atividade não tem exercício', () => {
		const correcao = corrigirExercicio(
			normalizarBlocos([{ id: 't', tipo: 'texto', conteudo: 'oi' }]),
			form({})
		);
		expect(correcao).toEqual({ questoes: [], dissertativas: [], acertos: 0, total: 0 });
	});
});

describe('múltipla escolha (checkbox)', () => {
	const multiplos = normalizarBlocos([questao('m1', [0, 2], 'checkbox')]);

	it('acerta só com o conjunto exato de alternativas', () => {
		expect(corrigirExercicio(multiplos, form({ q_m1: ['0', '2'] })).questoes[0]).toMatchObject({
			escolhida: [0, 2],
			correta: [0, 2],
			acertou: true
		});
	});

	it('erra quando falta alternativa (não vale o que está certo)', () => {
		const correcao = corrigirExercicio(multiplos, form({ q_m1: ['0'] }));
		expect(correcao.questoes[0].acertou).toBe(false);
		expect(correcao.acertos).toBe(0);
	});

	it('erra quando marca alternativa a mais, mesmo contendo todas as certas', () => {
		const correcao = corrigirExercicio(multiplos, form({ q_m1: ['0', '1', '2'] }));
		expect(correcao.questoes[0].acertou).toBe(false);
	});

	it('ordena e deduplica o que chegou do formulário', () => {
		const correcao = corrigirExercicio(multiplos, form({ q_m1: ['2', '0', '2'] }));
		expect(correcao.questoes[0].escolhida).toEqual([0, 2]);
		expect(correcao.questoes[0].acertou).toBe(true);
	});

	it('sem nenhuma marcada é errada, e o gabarito segue lista', () => {
		const correcao = corrigirExercicio(multiplos, form({}));
		expect(correcao.questoes[0]).toMatchObject({ escolhida: [], correta: [0, 2], acertou: false });
	});

	it('lê `q_` repetido e ignora valor inválido no meio', () => {
		const correcao = corrigirExercicio(multiplos, form({ q_m1: ['0', '9', '2'] }));
		expect(correcao.questoes[0].escolhida).toEqual([0, 2]);
	});
});

describe('blocos antigos', () => {
	it('trata exercício sem `selecao` como rádio de uma resposta', () => {
		const antigos = normalizarBlocos([
			{ id: 'a', tipo: 'exercicio', pergunta: 'q', alternativas: ['x', 'y'], correta: 1 }
		]);
		expect(corrigirExercicio(antigos, form({ q_a: '1' })).questoes[0]).toMatchObject({
			selecao: 'radio',
			correta: [1],
			acertou: true
		});
	});
});

describe('dissertativa', () => {
	const comDissertativa = normalizarBlocos([
		questao('q1', 0, 'radio'),
		{ id: 'd1', tipo: 'dissertativa', pergunta: 'Explique o teorema', orientacao: 'com suas palavras' }
	] as Blocos);

	it('devolve o texto do aluno e não entra na nota', () => {
		const correcao = corrigirExercicio(comDissertativa, form({ q_q1: '0', d_d1: 'Porque o limite.' }));
		expect(correcao.dissertativas).toEqual([
			{ id: 'd1', pergunta: 'Explique o teorema', orientacao: 'com suas palavras', resposta: 'Porque o limite.' }
		]);
		expect(correcao).toMatchObject({ total: 1, acertos: 1 });
	});

	it('aceita resposta vazia e corta texto gigante', () => {
		expect(corrigirExercicio(comDissertativa, form({})).dissertativas[0].resposta).toBe('');
		const longo = 'x'.repeat(LIMITE_DISSERTATIVA + 500);
		const correcao = corrigirExercicio(comDissertativa, form({ d_d1: longo }));
		expect(correcao.dissertativas[0].resposta).toHaveLength(LIMITE_DISSERTATIVA);
	});
});

describe('questoesPublicas', () => {
	it('leva o tipo de seleção e nunca o gabarito nem a explicação', () => {
		const [publica] = questoesPublicas(
			normalizarBlocos([{ ...questao('m1', [0, 2], 'checkbox'), explicacao: 'não pode vazar' }])
		);
		expect(publica).toEqual({
			id: 'm1',
			pergunta: 'Pergunta m1',
			alternativas: ['a', 'b', 'c'],
			selecao: 'checkbox'
		});
		expect(JSON.stringify(publica)).not.toMatch(/correta|explicacao|não pode vazar/);
	});
});
