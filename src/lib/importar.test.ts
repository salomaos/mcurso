import { describe, it, expect } from 'vitest';
import { TIPOS_BLOCO } from './blocks';
import {
	EXEMPLO_APOSTILA,
	EXEMPLOS_IMPORTACAO,
	interpretarImportacao,
	resumoImportacao
} from './importar';

function apostilaJson(parcial: Record<string, unknown> = {}): string {
	return JSON.stringify({
		conteudo: 'apostila',
		titulo: 'Revisão',
		secoes: [
			{
				nome: 'Bloco 1',
				aulas: [
					{
						titulo: 'Aula 1',
						descricao: 'Primeira',
						blocos: [{ tipo: 'titulo', texto: 'Título', nivel: 1 }]
					}
				]
			}
		],
		...parcial
	});
}

describe('interpretarImportacao', () => {
	it('rejeita texto que não é JSON', () => {
		expect(interpretarImportacao('não é json')).toMatchObject({ erro: /não é um JSON válido/ });
	});

	it('exige o campo conteudo com valor conhecido', () => {
		expect(interpretarImportacao('{"titulo":"x"}')).toMatchObject({ erro: /conteudo/ });
		expect(interpretarImportacao('{"conteudo":"numero"}')).toMatchObject({ erro: /conteudo/ });
	});

	it('aceita "atividade" como apelido de "exercicio"', () => {
		const resultado = interpretarImportacao(
			JSON.stringify({ conteudo: 'atividade', titulo: 'Prova', blocos: [] })
		);
		expect(resultado).toMatchObject({ dados: { conteudo: 'exercicio' } });
	});

	it('parseia apostila com seções e aulas', () => {
		const resultado = interpretarImportacao(apostilaJson());
		expect(resultado).toMatchObject({
			dados: {
				conteudo: 'apostila',
				titulo: 'Revisão',
				secoes: [{ nome: 'Bloco 1', aulas: [{ titulo: 'Aula 1' }] }]
			}
		});
		if ('dados' in resultado) {
			const aula = resultado.dados.conteudo === 'apostila' ? resultado.dados.secoes[0].aulas[0] : null;
			expect(aula?.blocos).toEqual([{ tipo: 'titulo', texto: 'Título', nivel: 1 }]);
		}
	});

	it('aceita apostila só com aulas soltas (sem seções)', () => {
		const resultado = interpretarImportacao(apostilaJson({ secoes: undefined, aulas: [{ titulo: 'Só aula', blocos: [] }] }));
		expect(resultado).toMatchObject({ dados: { conteudo: 'apostila', aulas: [{ titulo: 'Só aula' }] } });
		if ('dados' in resultado && resultado.dados.conteudo === 'apostila') {
			expect(resultado.dados.secoes).toEqual([]);
		}
	});

	it('rejeita apostila sem nenhuma aula', () => {
		const resultado = interpretarImportacao(apostilaJson({ secoes: [], aulas: [] }));
		expect(resultado).toMatchObject({ erro: /pelo menos uma aula/ });
	});

	it('aponta o bloco que não é objeto', () => {
		const resultado = interpretarImportacao(apostilaJson({ secoes: undefined, aulas: [{ titulo: 'x', blocos: ['não objeto'] }] }));
		expect(resultado).toMatchObject({ erro: /bloco 1/ });
	});

	it('deriva o quiz para o parser do editor e passa o erro dele', () => {
		const valido = interpretarImportacao(
			JSON.stringify({
				conteudo: 'quiz',
				titulo: 'Quiz A',
				perguntas: [{ pergunta: 'x', alternativas: ['a', 'b'], correta: 1 }]
			})
		);
		expect(valido).toMatchObject({ dados: { conteudo: 'quiz', quiz: { titulo: 'Quiz A' } } });

		const invalido = interpretarImportacao(JSON.stringify({ conteudo: 'quiz', perguntas: [] }));
		expect(invalido).toMatchObject({ erro: /pergunta/ });
	});

	it('rejeita bloco não-objeto em anexo', () => {
		const resultado = interpretarImportacao(
			JSON.stringify({ conteudo: 'anexo', titulo: 'Anexo', blocos: [42] })
		);
		expect(resultado).toMatchObject({ erro: /bloco 1/ });
	});
});

describe('resumoImportacao', () => {
	it('conta seções, aulas e blocos da apostila, sem pendencias no exemplo', () => {
		const resultado = interpretarImportacao(EXEMPLO_APOSTILA);
		expect(resultado).not.toHaveProperty('erro');
		if ('erro' in resultado) return;

		const resumo = resumoImportacao(resultado.dados);
		expect(resumo).toMatchObject({
			tipo: 'apostila',
			rotuloTipo: 'Apostila',
			secoes: 2,
			aulas: 3,
			blocos: 16,
			desconhecidos: 0,
			pendencias: []
		});
	});

	it('a apostila de exemplo cobre todos os tipos de bloco', () => {
		const resultado = interpretarImportacao(EXEMPLO_APOSTILA);
		if ('erro' in resultado) throw new Error(resultado.erro);
		if (resultado.dados.conteudo !== 'apostila') throw new Error('esperava apostila');
		const blocos = [
			...resultado.dados.aulas.flatMap((aula) => aula.blocos),
			...resultado.dados.secoes.flatMap((secao) => secao.aulas.flatMap((aula) => aula.blocos))
		].map((bloco) => bloco.tipo);
		expect(new Set(blocos)).toEqual(new Set(TIPOS_BLOCO.map((tipo) => tipo.id)));
	});

	it('todos os exemplos de conteúdo abrem sem erro e sem pendencias', () => {
		expect(EXEMPLOS_IMPORTACAO.map((exemplo) => exemplo.conteudo)).toEqual([
			'apostila',
			'anexo',
			'exercicio',
			'quiz'
		]);
		for (const exemplo of EXEMPLOS_IMPORTACAO) {
			const resultado = interpretarImportacao(exemplo.json);
			expect(resultado, exemplo.rotulo).not.toHaveProperty('erro');
			if ('erro' in resultado) continue;
			const resumo = resumoImportacao(resultado.dados);
			expect(resumo.rotuloTipo, exemplo.rotulo).toBe(exemplo.rotulo);
			expect(resumo.pendencias, exemplo.rotulo).toEqual([]);
			if (exemplo.conteudo === 'quiz') {
				expect(resumo.perguntas).toBeGreaterThan(0);
			} else {
				expect(resumo.blocos).toBeGreaterThan(0);
			}
		}
	});

	it('marca bloco desconhecido como ignorado', () => {
		const resultado = interpretarImportacao(
			apostilaJson({
				secoes: undefined,
				aulas: [{ titulo: 'x', blocos: [{ tipo: 'video', url: 'x' }] }]
			})
		);
		if ('erro' in resultado) throw new Error('esperava dados');
		expect(resumoImportacao(resultado.dados).desconhecidos).toBe(1);
	});

	it('lista link interno sem alvo como pendente (não bloqueia)', () => {
		const resultado = interpretarImportacao(
			apostilaJson({
				secoes: undefined,
				aulas: [
					{
						titulo: 'x',
						blocos: [{ tipo: 'link', rotulo: 'L', tipoLink: 'aula' }]
					}
				]
			})
		);
		if ('erro' in resultado) throw new Error('esperava dados');
		const pendentes = resumoImportacao(resultado.dados).pendencias;
		expect(pendentes).toHaveLength(1);
		expect(pendentes[0].motivo).toMatch(/sem alvo/);
	});

	it('resumo do quiz usa a validação do quiz', () => {
		const resultado = interpretarImportacao(
			JSON.stringify({ conteudo: 'quiz', titulo: 'Q', perguntas: [] })
		);
		expect(resultado).toMatchObject({ erro: /pergunta/ });
	});
});