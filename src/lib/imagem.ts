// Imagem do resultado, desenhada no cliente com Canvas 2D — sem dependência e
// sem passar o HTML por html2canvas.
//
// O card é só texto: imagens de blocos não entram porque `/uploads/*` exige
// sessão e o PNG é gerado no navegador do aluno (que não está logado).
// A fonte é do sistema, então `ctx.font` só pode usar famílias genéricas.

import { temMatematica } from '$lib/matematica';
import type { Correcao } from '$lib/conteudo';

export type DadosImagem = {
	nome: string;
	titulo: string;
	apostila: string | null;
	aula: string | null;
	correcao: Correcao;
	chave: string;
	quando: string;
};

const LARGURA = 900;
const MARGEM = 48;
const ALTURA_LINHA = 26;
const FONTE = 'ui-sans-serif, system-ui, "Segoe UI", Arial, sans-serif';
const MONO = 'ui-monospace, "Cascadia Mono", Consolas, monospace';

// Cinzas fixos: o PNG é um arquivo separado, sem relação com o tema do
// navegador, então não existe token do ahmardesign para consultar.
const TINTA = '#1f2937';
const SUAVE = '#6b7280';
const CERTA = '#15803d';
const ERRADA = '#b91c1c';

type Linha = { texto: string; fonte: string; cor: string; recuo: number; espacoAntes: number };

function letra(indice: number) {
	return String.fromCharCode(65 + indice);
}

// Lista o que será desenhado. Montar antes de pintar permite medir a altura
// exata (`measureText`) em vez de chutar quantos caracteres cabem por linha.
function linhas(dados: DadosImagem): Linha[] {
	const { correcao } = dados;
	const lista: Linha[] = [];
	const push = (texto: string, fonte: string, cor: string, recuo = 0, espacoAntes = 0) =>
		lista.push({ texto, fonte, cor, recuo, espacoAntes });

	const trilha = [dados.apostila, dados.aula].filter(Boolean).join('  ›  ');
	if (trilha) push(trilha, `600 16px ${FONTE}`, SUAVE);

	push(dados.titulo, `700 30px ${FONTE}`, TINTA, 0, 10);
	push(`Aluno: ${dados.nome}`, `400 18px ${FONTE}`, SUAVE, 0, 14);
	// Atividade só de dissertativa não tem nota: mostra as perguntas, e o texto
	// do aluno logo abaixo de cada uma.
	push(
		correcao.total > 0
			? `${correcao.acertos} de ${correcao.total} acertos`
			: 'Atividade discursiva (sem nota automática)',
		`700 22px ${FONTE}`,
		TINTA,
		0,
		6
	);
	push(dados.quando, `400 16px ${FONTE}`, SUAVE, 0, 2);

	correcao.questoes.forEach((questao, indice) => {
		push(
			`${indice + 1}. ${questao.pergunta}`,
			`600 18px ${FONTE}`,
			TINTA,
			0,
			22
		);
		questao.alternativas.forEach((alternativa, posicao) => {
			const gabarito = questao.correta.includes(posicao);
			const escolhida = questao.escolhida.includes(posicao);
			// Marcação no formato de quem preenche a folha: [x] é a resposta dada e
			// "gabarito" deixa claro o que era certo — a cor sozinha não sobrevive a
			// impressão em tons de cinza.
			const marca = escolhida ? '[x]' : '[ ]';
			const aviso = gabarito && !escolhida ? ' — gabarito' : '';
			push(
				`${letra(posicao)}) ${marca} ${alternativa}${aviso}`,
				temMatematica(alternativa) ? `400 16px ${MONO}` : `400 16px ${FONTE}`,
				gabarito ? CERTA : escolhida ? ERRADA : TINTA,
				16,
				2
			);
		});
		if (questao.explicacao) {
			push(questao.explicacao, `italic 15px ${FONTE}`, SUAVE, 16, 6);
		}
	});

	correcao.dissertativas.forEach((dissertativa, indice) => {
		push(
			`Dissertativa ${indice + 1} — para avaliação`,
			`600 18px ${FONTE}`,
			TINTA,
			0,
			22
		);
		push(dissertativa.pergunta, `400 17px ${FONTE}`, SUAVE, 0, 4);
		if (dissertativa.resposta.trim() === '') {
			push('(sem resposta)', `italic 15px ${FONTE}`, SUAVE, 16, 4);
		} else {
			push(dissertativa.resposta, `400 16px ${FONTE}`, TINTA, 16, 4);
		}
	});

	push('Chave de integridade', `600 14px ${FONTE}`, SUAVE, 0, 24);
	push(dados.chave, `400 13px ${MONO}`, TINTA, 0, 6);

	return lista;
}

function quebrar(
	ctx: CanvasRenderingContext2D,
	texto: string,
	fonte: string,
	largura: number
): string[] {
	ctx.font = fonte;
	// Palavra isolada maior que a linha (ex.: uma fórmula colada) é cortada.
	const partes: string[] = [];
	for (const palavra of texto.split(/\s+/).filter(Boolean)) {
		if (ctx.measureText(palavra).width <= largura) {
			partes.push(palavra);
			continue;
		}
		let resto = palavra;
		while (resto.length > 0) {
			let corte = resto.length;
			while (corte > 1 && ctx.measureText(resto.slice(0, corte)).width > largura) corte -= 1;
			partes.push(resto.slice(0, corte));
			resto = resto.slice(corte);
		}
	}

	const resultado: string[] = [];
	let atual = '';
	for (const parte of partes) {
		if (!atual) atual = parte;
		else if (ctx.measureText(`${atual} ${parte}`).width <= largura) atual += ` ${parte}`;
		else {
			resultado.push(atual);
			atual = parte;
		}
	}
	if (atual) resultado.push(atual);
	return resultado;
}

export function resultadoParaImagem(dados: DadosImagem): string {
	// Atividade só de dissertativa não tem nota, mas tem o que desenhar.
	if (dados.correcao.total === 0 && dados.correcao.dissertativas.length === 0) {
		throw new Error('Resultado sem perguntas para desenhar.');
	}

	const canvas = document.createElement('canvas');
	canvas.width = LARGURA;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas indisponível neste navegador.');
	ctx.textBaseline = 'top';

	const itens = linhas(dados);
	const larguraUtil = LARGURA - 2 * MARGEM;

	// Passo 1: medir. `measureText` funciona antes de a altura ser definida.
	const medido = itens.map((linha) => ({
		linha,
		partes: quebrar(ctx, linha.texto, linha.fonte, larguraUtil - linha.recuo)
	}));
	const altura =
		medido.reduce(
			(total, item) => total + item.partes.length * ALTURA_LINHA + item.linha.espacoAntes,
			MARGEM * 2
		) + medido.at(-1)!.partes.length * 4;

	canvas.height = Math.ceil(altura);

	// Passo 2: pintar.
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	let y = MARGEM;
	for (const { linha, partes } of medido) {
		y += linha.espacoAntes;
		ctx.fillStyle = linha.cor;
		ctx.font = linha.fonte;
		for (const parte of partes) {
			ctx.fillText(parte, MARGEM + linha.recuo, y);
			y += ALTURA_LINHA;
		}
	}

	return canvas.toDataURL('image/png');
}
