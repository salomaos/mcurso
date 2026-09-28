// Chave de integridade do resultado: um resumo assinado do que o aluno
// respondeu, para a tela de validação conseguir ler depois a partir do print.
//
// O segredo é o do Better Auth com um rótulo de domínio, então uma chave de
// resultado nunca vale como segredo de sessão (e vice-versa).

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import 'dotenv/config';

const ROTULO = 'mcurso:chave-resultado:v1';

export type DadosChave = {
	/** versão do formato, para a validação conseguir migrar depois */
	v: 1;
	nome: string;
	/** epoch em segundos */
	quando: number;
	exercicio: number;
	titulo: string;
	apostila: string | null;
	aula: string | null;
	acertos: number;
	total: number;
	/** resumo curto do gabarito no momento da resposta */
	gabarito: string;
	nonce: string;
};

export type LeituraChave = { dados: DadosChave } | { erro: string };

function segredo(): string {
	return process.env.BETTER_AUTH_SECRET ?? 'mcurso-dev-secret-troque-no-env';
}

function assinar(conteudo: string): string {
	return createHmac('sha256', segredo()).update(`${ROTULO}:${conteudo}`).digest('base64url').slice(0, 16);
}

export function criarChave(dados: Omit<DadosChave, 'v' | 'nonce'>): string {
	const payload: DadosChave = { v: 1, nonce: randomBytes(6).toString('hex'), ...dados };
	const conteudo = Buffer.from(JSON.stringify(payload)).toString('base64url');
	return `${conteudo}.${assinar(conteudo)}`;
}

// Aceita a chave com ou sem separadores (é assim que ela aparece no print).
export function lerChave(chave: string): LeituraChave {
	const cru = chave.replace(/\s+/g, '');
	const partes = cru.split('.');
	if (partes.length !== 2) return { erro: 'Chave malformada: expected payload.assinatura.' };

	const [conteudo, assinatura] = partes as [string, string];
	const esperada = Buffer.from(assinar(conteudo));
	if (esperada.length !== assinatura.length || !timingSafeEqual(esperada, Buffer.from(assinatura))) {
		return { erro: 'Assinatura inválida: a chave foi alterada ou não saiu deste app.' };
	}

	try {
		const dados = JSON.parse(Buffer.from(conteudo, 'base64url').toString('utf8')) as DadosChave;
		if (dados?.v !== 1) return { erro: `Versão de chave desconhecida: ${dados?.v}.` };
		return { dados };
	} catch {
		return { erro: 'Conteúdo da chave ilegível.' };
	}
}

// Só para exibição: a chave sai em blocos de 6 para caber numa linha de
// monoespaçada, e a validação ignora os espaços.
export function formatarChave(chave: string): string {
	return (chave.match(/.{1,6}/g) ?? [chave]).join(' ');
}

export function formatarQuando(epochSegundos: number): string {
	return new Date(epochSegundos * 1000).toLocaleString('pt-BR');
}
