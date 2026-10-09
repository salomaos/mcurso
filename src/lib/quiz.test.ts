import { describe, it, expect } from 'vitest';
import {
	calcularRanking,
	interpretarQuizImportado,
	normalizarPerguntas,
	pontosDaResposta,
	validarPerguntas,
	TEMPO_PADRAO,
	PONTOS_BASE,
	type PerguntaQuiz
} from './quiz';

function pergunta(parcial: Partial<PerguntaQuiz> = {}): PerguntaQuiz {
	return {
		id: 'p1',
		pergunta: 'Quanto é 2 + 2?',
		alternativas: ['3', '4', '5', '6'],
		correta: 1,
		tempo: 20,
		...parcial
	};
}

describe('normalizarPerguntas', () => {
	it('mantém perguntas válidas e descarta o que não é objeto', () => {
		const lista = normalizarPerguntas([pergunta(), null, 'x', { pergunta: '' }]);
		expect(lista).toHaveLength(1);
		expect(lista[0].alternativas).toEqual(['3', '4', '5', '6']);
	});

	it('usa o padrão quando correta e tempo estão fora da faixa', () => {
		const [p] = normalizarPerguntas([
			{ pergunta: 'x', alternativas: ['a', 'b'], correta: 9, tempo: 999 }
		]);
		expect(p.correta).toBe(0);
		expect(p.tempo).toBe(TEMPO_PADRAO);
	});

	it('gera id quando a pergunta não traz um', () => {
		const [p] = normalizarPerguntas([{ pergunta: 'x', alternativas: ['a', 'b'], correta: 1 }]);
		expect(p.id).toBeTruthy();
	});

	it('devolve lista vazia quando o valor não é array', () => {
		expect(normalizarPerguntas('nada')).toEqual([]);
	});
});

describe('validarPerguntas', () => {
	it('cobra ao menos uma pergunta', () => {
		expect(validarPerguntas([])).toMatch(/pelo menos uma pergunta/);
	});

	it('cobra alternativas suficientes e sem branco', () => {
		expect(validarPerguntas([pergunta({ alternativas: ['só uma'] })])).toMatch(/pelo menos 2/);
		expect(validarPerguntas([pergunta({ alternativas: ['', 'b'] })])).toMatch(/em branco/);
	});

	it('cobra a alternativa correta dentro da faixa', () => {
		expect(validarPerguntas([pergunta({ correta: 9 })])).toMatch(/sem alternativa correta/);
	});

	it('aceita uma pergunta completa', () => {
		expect(validarPerguntas([pergunta()])).toBeNull();
	});
});

describe('pontosDaResposta', () => {
	it('resposta errada não pontua', () => {
		expect(pontosDaResposta(false, 0, 20)).toBe(0);
	});

	it('pontua mais rápido do que devagar, dentro da base', () => {
		const rapido = pontosDaResposta(true, 0, 20);
		const lento = pontosDaResposta(true, 19_000, 20);
		expect(rapido).toBe(PONTOS_BASE);
		expect(lento).toBeGreaterThanOrEqual(PONTOS_BASE / 2);
		expect(lento).toBeLessThan(rapido);
	});

	it('não passa da base nem cai abaixo da metade', () => {
		expect(pontosDaResposta(true, -500, 20)).toBe(PONTOS_BASE);
		expect(pontosDaResposta(true, 999_999, 20)).toBe(PONTOS_BASE / 2);
	});
});

describe('calcularRanking', () => {
	it('ordena por pontuação e divide a posição em empate', () => {
		const ranking = calcularRanking([
			{ id: 'a', nome: 'Ana', pontuacao: 100 },
			{ id: 'b', nome: 'Bia', pontuacao: 300 },
			{ id: 'c', nome: 'Caio', pontuacao: 300 }
		]);
		expect(ranking.map((linha) => linha.posicao)).toEqual([1, 1, 3]);
		expect(ranking[0].nome).toBe('Bia');
		expect(ranking[2].nome).toBe('Ana');
	});
});

describe('interpretarQuizImportado', () => {
	it('lê o objeto com titulo e perguntas', () => {
		const resultado = interpretarQuizImportado(
			JSON.stringify({
				titulo: 'Revisão',
				perguntas: [
					{ pergunta: 'Q1', alternativas: ['a', 'b', 'c'], correta: 2, tempo: 15 }
				]
			})
		);
		expect('perguntas' in resultado).toBe(true);
		if (!('perguntas' in resultado)) return;
		expect(resultado.titulo).toBe('Revisão');
		expect(resultado.perguntas[0].correta).toBe(2);
		expect(resultado.perguntas[0].tempo).toBe(15);
	});

	it('aceita um array direto e apelidos de campo', () => {
		const resultado = interpretarQuizImportado(
			JSON.stringify([
				{ enunciado: 'Q1', opcoes: ['a', 'b'], corretaIndice: 1 },
				{ questao: 'Q2', choices: ['x', 'y'], answer: 'y' }
			])
		);
		if (!('perguntas' in resultado)) throw new Error('deveria importar');
		expect(resultado.perguntas).toHaveLength(2);
		expect(resultado.perguntas[0].correta).toBe(1);
		expect(resultado.perguntas[1].correta).toBe(1);
	});

	it('aceita alternativas como objeto com a marca correta', () => {
		const resultado = interpretarQuizImportado(
			JSON.stringify([
				{
					pergunta: 'Q1',
					alternativas: [
						{ texto: 'a', correta: false },
						{ texto: 'b', correta: true }
					]
				}
			])
		);
		if (!('perguntas' in resultado)) throw new Error('deveria importar');
		expect(resultado.perguntas[0].correta).toBe(1);
	});

	it('recusa JSON inválido, sem perguntas e sem correta', () => {
		expect(interpretarQuizImportado('nope')).toHaveProperty('erro');
		expect(interpretarQuizImportado('{}')).toHaveProperty('erro');
		expect(
			interpretarQuizImportado(JSON.stringify([{ pergunta: 'Q1', alternativas: ['a', 'b'] }]))
		).toHaveProperty('erro');
	});
});
