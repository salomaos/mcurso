import { describe, it, expect } from 'vitest';
import { criarChave, formatarChave, formatarQuando, lerChave } from './chave';

const dados = {
	nome: 'Ana Souza',
	quando: 1_780_000_000,
	exercicio: 3,
	titulo: 'Revisão 1',
	apostila: 'Apostila da lista',
	aula: 'Aula 1',
	acertos: 4,
	total: 7,
	gabarito: 'abc123'
};

describe('chave de integridade', () => {
	it('lê de volta exatamente o que foi gravado', () => {
		const leitura = lerChave(criarChave(dados));
		expect(leitura).toEqual({ dados: expect.objectContaining({ v: 1, ...dados }) });
	});

	it('aceita a chave com os espaços que aparecem no print', () => {
		const chave = criarChave(dados);
		expect(lerChave(formatarChave(chave))).toEqual(lerChave(chave));
	});

	it('recusa payload adulterado', () => {
		const [payload, assinatura] = criarChave(dados).split('.');
		const original = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
		const adulterado = Buffer.from(
			JSON.stringify({ ...original, acertos: original.acertos + 1 })
		).toString('base64url');

		expect(lerChave(`${adulterado}.${assinatura}`)).toEqual({
			erro: expect.stringContaining('Assinatura inválida')
		});
	});

	it('recusa assinatura de outra chave', () => {
		const a = criarChave(dados).split('.');
		const b = criarChave({ ...dados, nome: 'Outro' }).split('.');
		expect(lerChave(`${a[0]}.${b[1]}`)).toEqual({ erro: expect.stringContaining('Assinatura inválida') });
	});

	it('recusa chave malformada', () => {
		expect(lerChave('sem-ponto')).toEqual({ erro: expect.stringContaining('malformada') });
	});

	it('nunca repete o nonce entre duas chaves iguais', () => {
		expect(criarChave(dados)).not.toBe(criarChave(dados));
	});

	it('formata a chave em blocos curtos, sem perder o conteúdo', () => {
		const chave = criarChave(dados);
		const formatada = formatarChave(chave);
		expect(formatada).toMatch(/^(\S{1,6} )+\S{1,6}$/);
		expect(formatada.replace(/\s+/g, '')).toBe(chave);
		expect(formatarQuando(dados.quando)).toMatch(/\d{2}\/\d{2}\/\d{4}/);
	});
});
