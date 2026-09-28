// Correção das respostas de uma atividade. Pura de propósito: sem banco e sem
// request, roda igual no POST do servidor e no teste unitário.

import { corretasDoExercicio, ehMultiplaEscolha, type Blocos } from './blocks';
import type {
	Correcao,
	CorrecaoDissertativa,
	CorrecaoQuestao,
	DissertativaPublica,
	QuestaoPublica
} from './conteudo';

export { type Correcao, type CorrecaoDissertativa, type CorrecaoQuestao };

// Limite de caracteres do texto da dissertativa: o campo do formulário tem o
// mesmo `maxlength` e o resultado volta no `form` (nada é gravado), então
// limitar aqui evita carregar texto gigante para a chave e para a imagem.
export const LIMITE_DISSERTATIVA = 4000;

function questoesDoExercicio(blocos: Blocos) {
	return blocos.filter((bloco) => bloco.tipo === 'exercicio');
}

function dissertativasDoExercicio(blocos: Blocos) {
	return blocos.filter((bloco) => bloco.tipo === 'dissertativa');
}

function indiceValido(valor: string, total: number): number | null {
	const indice = Number(valor);
	if (!Number.isInteger(indice) || indice < 0 || indice >= total) return null;
	return indice;
}

// As respostas chegam como `q_<id da questão>`. `radio` manda um valor, `checkbox`
// manda vários com o mesmo nome. Índice fora da faixa (ou ausente) vale como "não
// respondeu": não é erro de formulário, é zero.
// `Number('')` é 0, então o campo em branco precisa ser descartado antes — senão
// uma resposta vazia valeria como a primeira alternativa.
function resposta(form: FormData, id: string, total: number, multipla: boolean): number[] {
	const bruto = multipla ? form.getAll(`q_${id}`) : [form.get(`q_${id}`)];
	const indices: number[] = [];
	for (const valor of bruto) {
		if (typeof valor !== 'string' || valor.trim() === '') continue;
		const indice = indiceValido(valor, total);
		if (indice !== null) indices.push(indice);
	}
	return [...new Set(indices)].sort((a, b) => a - b);
}

function texto(form: FormData, id: string): string {
	const cru = form.get(`d_${id}`);
	return (typeof cru === 'string' ? cru : '').slice(0, LIMITE_DISSERTATIVA);
}

export function corrigirExercicio(blocos: Blocos, form: FormData): Correcao {
	const corrigidas: CorrecaoQuestao[] = questoesDoExercicio(blocos).map((bloco) => {
		const multipla = ehMultiplaEscolha(bloco);
		const escolhida = resposta(form, bloco.id, bloco.alternativas.length, multipla);
		const correta = corretasDoExercicio(bloco);

		// Múltipla escolha exige o conjunto exato: marcar a certa e mais uma já
		// é errado.
		const acertou =
			escolhida.length === correta.length && escolhida.every((indice, i) => indice === correta[i]);

		return {
			id: bloco.id,
			pergunta: bloco.pergunta,
			selecao: multipla ? 'checkbox' : 'radio',
			escolhida,
			correta,
			acertou,
			alternativas: bloco.alternativas,
			explicacao: bloco.explicacao
		};
	});

	const discursivas: CorrecaoDissertativa[] = dissertativasDoExercicio(blocos).map((bloco) => ({
		id: bloco.id,
		pergunta: bloco.pergunta,
		orientacao: bloco.orientacao || undefined,
		resposta: texto(form, bloco.id)
	}));

	return {
		questoes: corrigidas,
		dissertativas: discursivas,
		acertos: corrigidas.filter((questao) => questao.acertou).length,
		total: corrigidas.length
	};
}

// Conversões para o payload público. Ficam aqui (e não no servidor) porque são
// a mesma regra do gabarito: quem monta a página pública tem que usar isto, e não
// montar o objeto na mão correndo o risco de vazar `correta`.
export function questoesPublicas(blocos: Blocos): QuestaoPublica[] {
	return questoesDoExercicio(blocos).map((bloco) => ({
		id: bloco.id,
		pergunta: bloco.pergunta,
		alternativas: bloco.alternativas,
		selecao: ehMultiplaEscolha(bloco) ? 'checkbox' : 'radio'
	}));
}

export function dissertativasPublicas(blocos: Blocos): DissertativaPublica[] {
	return dissertativasDoExercicio(blocos).map((bloco) => ({
		id: bloco.id,
		pergunta: bloco.pergunta,
		orientacao: bloco.orientacao || undefined
	}));
}
