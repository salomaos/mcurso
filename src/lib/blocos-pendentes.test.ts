import { describe, it, expect } from 'vitest';
import { blocosPendentes, pendenciasDeImportacao } from './blocos-pendentes';
import { novoId, type Bloco } from './blocks';

type SemId<T> = T extends unknown ? Omit<T, 'id'> : never;

function comId(bloco: SemId<Bloco>): Bloco {
	return { id: novoId(), ...bloco };
}

describe('blocosPendentes (blocos normalizados)', () => {
	it('avisa bloco vazio em cada tipo', () => {
		const blocos: Bloco[] = [
			comId({ tipo: 'titulo', texto: '', nivel: 1 }),
			comId({ tipo: 'texto', conteudo: '' }),
			comId({ tipo: 'codigo', linguagem: 'js', codigo: '' }),
			comId({ tipo: 'link', rotulo: '', tipoLink: 'externo' }),
			comId({ tipo: 'exercicio', pergunta: '', alternativas: ['', ''], selecao: 'radio', correta: 0 }),
			comId({ tipo: 'dissertativa', pergunta: '' }),
			comId({ tipo: 'simulacao', biblioteca: 'p5', codigo: '', altura: 240 })
		];
		const pendentes = blocosPendentes(blocos);
		expect(pendentes.map((p) => p.rotulo)).toEqual([
			'Título',
			'Texto',
			'Código',
			'Link',
			'Exercício',
			'Dissertativa',
			'Simulação'
		]);
	});

	it('indice é a posição 1-based do bloco', () => {
		const pendentes = blocosPendentes([
			comId({ tipo: 'texto', conteudo: 'ok' }),
			comId({ tipo: 'texto', conteudo: '' })
		]);
		expect(pendentes).toHaveLength(1);
		expect(pendentes[0].indice).toBe(2);
	});

	it('não avisa bloco cumprindo o papel', () => {
		const blocos: Bloco[] = [
			comId({ tipo: 'titulo', texto: 'Definição', nivel: 2 }),
			comId({ tipo: 'texto', conteudo: 'Conteúdo' }),
			comId({ tipo: 'exercicio', pergunta: 'Pergunta', alternativas: ['a', 'b'], selecao: 'radio', correta: 0 }),
			comId({ tipo: 'link', rotulo: 'Ver', tipoLink: 'anexo', alvoId: 1 })
		];
		expect(blocosPendentes(blocos)).toEqual([]);
	});

	it('avisa alternativa em branco no exercício', () => {
		const pendentes = blocosPendentes([
			comId({ tipo: 'exercicio', pergunta: 'Pergunta', alternativas: ['a', ''], selecao: 'radio', correta: 0 })
		]);
		expect(pendentes[0].motivo).toMatch(/alternativa em branco/);
	});
});

describe('pendenciasDeImportacao (JSON cru da prévia)', () => {
	it('avisa link interno sem alvo', () => {
		const pendentes = pendenciasDeImportacao([{ tipo: 'link', rotulo: 'L', tipoLink: 'aula' }]);
		expect(pendentes).toHaveLength(1);
		expect(pendentes[0].motivo).toMatch(/sem alvo/);
	});

	it('reserva para anexo/atividade o alvo só por id/título existente', () => {
		const pendentes = pendenciasDeImportacao([
			{ tipo: 'link', rotulo: 'L', tipoLink: 'anexo', alvoTitulo: 'X' }
		]);
		expect(pendentes[0].motivo).toMatch(/o alvo precisa existir/);
	});

	it('link de aula com alvoTitulo não é pendente', () => {
		const pendentes = pendenciasDeImportacao([
			{ tipo: 'link', rotulo: 'L', tipoLink: 'aula', alvoTitulo: 'Aula 1' }
		]);
		expect(pendentes).toEqual([]);
	});

	it('avisa vazio no JSON cru mesmo sem os campos esperados', () => {
		const pendentes = pendenciasDeImportacao([
			{ tipo: 'tabela' },
			{ tipo: 'exercicio', pergunta: 'sem alternativas' }
		]);
		expect(pendentes.map((p) => p.motivo)).toEqual([
			'tabela vazia',
			'sem alternativas (ou alternativa em branco)'
		]);
	});
});