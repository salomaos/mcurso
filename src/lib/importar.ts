// Importação de conteúdo por JSON colado de IA. Módulo client-safe: a página
// /importar usa para a prévia e o servidor revalida na criação (nunca confie no
// cliente). O contrato completo com os formatos vive em DOCS/importacao-ia.md.

import { TIPOS_BLOCO } from '$lib/blocks';
import { interpretarQuizImportado, validarPerguntas, type ImportacaoQuiz } from '$lib/quiz';
import type { Pendencia } from '$lib/blocos-pendentes';
import { pendenciasDeImportacao } from '$lib/blocos-pendentes';

// Tetos do import (por segurança; os editores não deixam passar disso).
export const LIMITES_IMPORTACAO = {
	maxJsonBytes: 512 * 1024,
	maxAulasPorApostila: 200,
	maxBlocosPorConteudo: 200
} as const;

export const ROTULO_TIPO_IMPORTACAO: Record<Importacao['conteudo'], string> = {
	apostila: 'Apostila',
	anexo: 'Anexo',
	exercicio: 'Atividade',
	quiz: 'Quiz'
};

export type ImportacaoBloco = { [chave: string]: unknown };
export type ImportacaoAula = { titulo: string; descricao: string; blocos: ImportacaoBloco[] };
export type ImportacaoSecao = { nome: string; aulas: ImportacaoAula[] };
export type ImportacaoApostila = {
	conteudo: 'apostila';
	titulo: string;
	descricao: string;
	secoes: ImportacaoSecao[];
	aulas: ImportacaoAula[];
};
export type ImportacaoSolto = {
	conteudo: 'anexo' | 'exercicio';
	titulo: string;
	descricao: string;
	blocos: ImportacaoBloco[];
};
export type ImportacaoQuizEnvelope = { conteudo: 'quiz'; quiz: ImportacaoQuiz };
export type Importacao = ImportacaoApostila | ImportacaoSolto | ImportacaoQuizEnvelope;
export type ResultadoImportacao = { dados: Importacao } | { erro: string };

export type ResumoImportacao = {
	tipo: Importacao['conteudo'];
	rotuloTipo: string;
	titulo: string;
	descricao: string;
	secoes: number;
	aulas: number;
	blocos: number;
	perguntas: number;
	desconhecidos: number;
	pendencias: Pendencia[];
};

// `atividade` e `exercicio` são a mesma coisa aqui (o banco chama de atividade).
const ALIASES_CONTEUDO: Record<string, Importacao['conteudo']> = {
	apostila: 'apostila',
	anexo: 'anexo',
	exercicio: 'exercicio',
	atividade: 'exercicio',
	quiz: 'quiz'
};

function objetoDe(valor: unknown): Record<string, unknown> | null {
	return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
		? (valor as Record<string, unknown>)
		: null;
}

function listaDe(valor: unknown): unknown[] | null {
	return Array.isArray(valor) ? valor : null;
}

type ErroOu<T> = { ok: T } | { erro: string };

function textoDe(
	objeto: Record<string, unknown>,
	campo: string,
	local: string,
	obrigatorio: boolean
): ErroOu<string> {
	const cru = objeto[campo];
	if (cru === undefined || cru === null) {
		if (obrigatorio) return { erro: `${local} está sem "${campo}".` };
		return { ok: '' };
	}
	if (typeof cru !== 'string') return { erro: `${local}: o campo "${campo}" precisa ser texto.` };
	const valor = cru.trim();
	if (obrigatorio && !valor) return { erro: `${local} está sem "${campo}".` };
	return { ok: valor };
}

function blocosDe(valor: unknown, local: string): ErroOu<ImportacaoBloco[]> {
	if (valor === undefined || valor === null) return { ok: [] };
	const lista = listaDe(valor);
	if (lista === null) return { erro: `${local}: o campo "blocos" precisa ser uma lista.` };
	if (lista.length > LIMITES_IMPORTACAO.maxBlocosPorConteudo) {
		return { erro: `${local} tem mais de ${LIMITES_IMPORTACAO.maxBlocosPorConteudo} blocos.` };
	}
	const blocos: ImportacaoBloco[] = [];
	for (const [indice, item] of lista.entries()) {
		const objeto = objetoDe(item);
		if (!objeto) return { erro: `O bloco ${indice + 1} (de ${local}) não é um objeto.` };
		blocos.push(objeto);
	}
	return { ok: blocos };
}

function aulaDe(valor: unknown, local: string): ErroOu<ImportacaoAula> {
	const objeto = objetoDe(valor);
	if (!objeto) return { erro: `${local} não é um objeto.` };
	const titulo = textoDe(objeto, 'titulo', local, true);
	if ('erro' in titulo) return titulo;
	const descricao = textoDe(objeto, 'descricao', local, false);
	if ('erro' in descricao) return descricao;
	const blocos = blocosDe(objeto.blocos, local);
	if ('erro' in blocos) return blocos;
	return { ok: { titulo: titulo.ok, descricao: descricao.ok, blocos: blocos.ok } };
}

function apostilaDe(objeto: Record<string, unknown>): ErroOu<ImportacaoApostila> {
	const titulo = textoDe(objeto, 'titulo', 'Apostila', true);
	if ('erro' in titulo) return titulo;
	const descricao = textoDe(objeto, 'descricao', 'Apostila', false);
	if ('erro' in descricao) return descricao;

	const secoes: ImportacaoSecao[] = [];
	const brutoSecoes = listaDe(objeto.secoes);
	if (brutoSecoes !== null) {
		for (const [indice, valor] of brutoSecoes.entries()) {
			const local = `Seção ${indice + 1}`;
			const objetoSecao = objetoDe(valor);
			if (!objetoSecao) return { erro: `${local} não é um objeto.` };
			const nome = textoDe(objetoSecao, 'nome', local, true);
			if ('erro' in nome) return nome;
			const brutoAulas = listaDe(objetoSecao.aulas);
			if (brutoAulas === null) return { erro: `${local}: o campo "aulas" precisa ser uma lista.` };
			const aulas: ImportacaoAula[] = [];
			for (const [aulaIndice, valorAula] of brutoAulas.entries()) {
				const aula = aulaDe(valorAula, `${local}, aula ${aulaIndice + 1}`);
				if ('erro' in aula) return aula;
				aulas.push(aula.ok);
			}
			secoes.push({ nome: nome.ok, aulas });
		}
	}

	const aulas: ImportacaoAula[] = [];
	const brutoAulas = listaDe(objeto.aulas);
	if (brutoAulas !== null) {
		for (const [indice, valor] of brutoAulas.entries()) {
			const aula = aulaDe(valor, `Aula ${indice + 1}`);
			if ('erro' in aula) return aula;
			aulas.push(aula.ok);
		}
	}

	const totalAulas = secoes.reduce((soma, secao) => soma + secao.aulas.length, 0) + aulas.length;
	if (totalAulas === 0) {
		return { erro: 'A apostila precisa de ao menos uma aula (em "secoes" ou em "aulas").' };
	}
	if (totalAulas > LIMITES_IMPORTACAO.maxAulasPorApostila) {
		return { erro: `A apostila tem mais de ${LIMITES_IMPORTACAO.maxAulasPorApostila} aulas.` };
	}

	return { ok: { conteudo: 'apostila', titulo: titulo.ok, descricao: descricao.ok, secoes, aulas } };
}

function soltoDe(objeto: Record<string, unknown>, tipo: 'anexo' | 'exercicio'): ErroOu<ImportacaoSolto> {
	const rotulo = tipo === 'anexo' ? 'Anexo' : 'Atividade';
	const titulo = textoDe(objeto, 'titulo', rotulo, true);
	if ('erro' in titulo) return titulo;
	const descricao = textoDe(objeto, 'descricao', rotulo, false);
	if ('erro' in descricao) return descricao;
	const blocos = blocosDe(objeto.blocos, rotulo.toLowerCase());
	if ('erro' in blocos) return blocos;
	return { ok: { conteudo: tipo, titulo: titulo.ok, descricao: descricao.ok, blocos: blocos.ok } };
}

export function interpretarImportacao(texto: string): ResultadoImportacao {
	if (new TextEncoder().encode(texto).byteLength > LIMITES_IMPORTACAO.maxJsonBytes) {
		return { erro: `O JSON é grande demais (máx. ${LIMITES_IMPORTACAO.maxJsonBytes / 1024} KB).` };
	}

	let bruto: unknown;
	try {
		bruto = JSON.parse(texto);
	} catch {
		return { erro: 'O texto colado não é um JSON válido.' };
	}

	const objeto = objetoDe(bruto);
	if (!objeto) {
		return { erro: 'O JSON precisa ser um objeto com o campo "conteudo" dizendo o que criar.' };
	}

	const cru = objeto.conteudo;
	const conteudo = typeof cru === 'string' ? ALIASES_CONTEUDO[cru.trim().toLowerCase()] : undefined;
	if (!conteudo) {
		return { erro: 'O campo "conteudo" precisa ser "apostila", "anexo", "exercicio" ou "quiz".' };
	}

	if (conteudo === 'quiz') {
		// O quiz tem o próprio parser (mesmo do editor "Colar um JSON pronto").
		const quiz = interpretarQuizImportado(texto);
		if ('erro' in quiz) return quiz;
		return { dados: { conteudo: 'quiz', quiz } };
	}

	const resultado = conteudo === 'apostila' ? apostilaDe(objeto) : soltoDe(objeto, conteudo);
	if ('erro' in resultado) return { erro: resultado.erro };
	return { dados: resultado.ok };
}

const TIPOS_BLOCO_ACEITOS = new Set<string>(TIPOS_BLOCO.map((tipo) => tipo.id));

// Resumo da prévia: o que a IA mandou (tipo, títulos, contagens) e os blocos
// que pedem atenção — descartados (tipo desconhecido) ou pendentes de alvo
// (link interno por id/título/ordem **ainda não resolvido**, só o servidor
// resolve na criação).
export function resumoImportacao(dados: Importacao): ResumoImportacao {
	if (dados.conteudo === 'quiz') {
		const pendencia = validarPerguntas(dados.quiz.perguntas);
		return {
			tipo: 'quiz',
			rotuloTipo: ROTULO_TIPO_IMPORTACAO.quiz,
			titulo: dados.quiz.titulo ?? 'Sem título',
			descricao: dados.quiz.descricao ?? '',
			secoes: 0,
			aulas: 0,
			blocos: 0,
			perguntas: dados.quiz.perguntas.length,
			desconhecidos: 0,
			pendencias: pendencia
				? [{ indice: 0, rotulo: 'Quiz', motivo: pendencia }]
				: []
		};
	}

	const blocosInformacao =
		dados.conteudo === 'apostila'
			? [
					...dados.aulas.flatMap((aula) => aula.blocos),
					...dados.secoes.flatMap((secao) => secao.aulas.flatMap((aula) => aula.blocos))
				]
			: dados.blocos;

	const desconhecidos = blocosInformacao.filter((bloco) => {
		const objeto = objetoDe(bloco);
		return (
			!objeto || typeof objeto.tipo !== 'string' || !TIPOS_BLOCO_ACEITOS.has(objeto.tipo)
		);
	}).length;

	const pergunta = { rotuloTipo: ROTULO_TIPO_IMPORTACAO[dados.conteudo], titulo: dados.titulo, descricao: dados.descricao };
	const pendencias = pendenciasDeImportacao(blocosInformacao);

	if (dados.conteudo === 'apostila') {
		const totalAulas = dados.aulas.length + dados.secoes.reduce((soma, secao) => soma + secao.aulas.length, 0);
		return {
			tipo: 'apostila',
			rotuloTipo: pergunta.rotuloTipo,
			titulo: pergunta.titulo,
			descricao: pergunta.descricao,
			secoes: dados.secoes.length,
			aulas: totalAulas,
			blocos: blocosInformacao.length,
			perguntas: 0,
			desconhecidos,
			pendencias
		};
	}

	return {
		tipo: dados.conteudo,
		rotuloTipo: pergunta.rotuloTipo,
		titulo: pergunta.titulo,
		descricao: pergunta.descricao,
		secoes: 0,
		aulas: 0,
		blocos: blocosInformacao.length,
		perguntas: 0,
		desconhecidos,
		pendencias
	};
}

// Exemplos de conteúdo, um por tipo, para quem começa do zero: abrir na página,
// copiar e colar no prompt da IA para ela gerar o JSON no mesmo formato. A
// apostila é o exemplo-mestre: cobre os 11 tipos de bloco (titulo, texto,
// codigo, mermaid, imagem, link, tabela, formula, exercicio, dissertativa,
// simulacao). Os demais mostram o formato próprio do tipo.
export const EXEMPLO_APOSTILA = `{
  "conteudo": "apostila",
  "titulo": "Matemática — Revisão",
  "descricao": "Importada de um JSON gerado pela IA.",
  "secoes": [
    {
      "nome": "Funções",
      "aulas": [
        {
          "titulo": "Função afim",
          "descricao": "Primeira aula da seção.",
          "blocos": [
            { "tipo": "titulo", "texto": "Definição", "nivel": 2 },
            { "tipo": "texto", "conteudo": "Função do tipo **f(x) = ax + b**, com *a ≠ 0*. Fórmula inline: $f(x) = ax + b$." },
            { "tipo": "codigo", "linguagem": "python", "codigo": "def f(x):\\n    return 2 * x + 1" },
            { "tipo": "formula", "latex": "f(x) = ax + b", "destaque": true },
            { "tipo": "tabela", "cabecalho": ["x", "f(x)"], "linhas": [["1", "3"], ["2", "5"], ["3", "7"]] },
            {
              "tipo": "exercicio",
              "pergunta": "Qual é o coeficiente angular de f(x) = 2x + 1?",
              "alternativas": ["1", "2", "3", "4"],
              "selecao": "radio",
              "correta": 1,
              "explicacao": "O coeficiente angular é o a, que vale 2."
            },
            {
              "tipo": "dissertativa",
              "pergunta": "Explique por que o gráfico de uma função afim é uma reta.",
              "orientacao": "Max. 5 linhas."
            }
          ]
        },
        {
          "titulo": "Gráfico da função afim",
          "descricao": "",
          "blocos": [
            { "tipo": "mermaid", "diagrama": "graph LR\\n  A[ax] --> B[b]", "tema": "neutral" },
            { "tipo": "imagem", "src": "https://picsum.photos/seed/mcurso/800/400", "legenda": "Gráfico típico de função afim." },
            { "tipo": "link", "rotulo": "Explorar no GeoGebra", "tipoLink": "externo", "url": "https://www.geogebra.org/" },
            {
              "tipo": "simulacao",
              "biblioteca": "p5",
              "altura": 300,
              "codigo": "function setup() {\\n  createCanvas(window.innerWidth, window.innerHeight);\\n}\\n\\nfunction draw() {\\n  background(20, 24, 33);\\n  fill(120, 200, 255);\\n  noStroke();\\n  circle(width / 2, height / 2, 40);\\n}"
            }
          ]
        }
      ]
    },
    {
      "nome": "Geometria",
      "aulas": [
        {
          "titulo": "Área do triângulo",
          "descricao": "",
          "blocos": [
            { "tipo": "titulo", "texto": "Fórmula da área", "nivel": 3 },
            { "tipo": "formula", "latex": "A = \\\\frac{b \\\\cdot h}{2}", "destaque": true },
            { "tipo": "texto", "conteudo": "Volte para a definição para revisar o coeficiente angular." },
            {
              "tipo": "exercicio",
              "pergunta": "Quais triângulos têm área igual a 12?",
              "alternativas": ["base 6 e altura 4", "base 3 e altura 8", "base 12 e altura 1", "base 6 e altura 2"],
              "selecao": "checkbox",
              "correta": [0, 1],
              "explicacao": "Área = (b · h) / 2: 6·4/2 = 12 e 3·8/2 = 12."
            },
            { "tipo": "link", "rotulo": "Ir para a função afim", "tipoLink": "aula", "alvoTitulo": "Função afim" }
          ]
        }
      ]
    }
  ]
}`;

// Material solto: o aluno abre por link dentro de uma aula (não aparece na
// listagem). Usa metade dos tipos de bloco fora do universo de prova/markdown.
export const EXEMPLO_ANEXO = `{
  "conteudo": "anexo",
  "titulo": "Manual de fórmulas",
  "descricao": "Material de apoio para consulta durante a prova.",
  "blocos": [
    { "tipo": "titulo", "texto": "Geometria de bolso", "nivel": 1 },
    { "tipo": "texto", "conteudo": "Fórmulas do bimestre em **um lugar só**. Itálico com *ênfase* e \`código\` também saem formatados." },
    { "tipo": "formula", "latex": "A = \\\\pi r^2", "destaque": true },
    { "tipo": "tabela", "cabecalho": ["Figura", "Área", "Perímetro"], "linhas": [["Quadrado", "a²", "4a"], ["Retângulo", "b · h", "2(b + h)"], ["Círculo", "πr²", "2πr"]] },
    { "tipo": "codigo", "linguagem": "js", "codigo": "const areaCirculo = (raio) => Math.PI * raio ** 2;" },
    { "tipo": "imagem", "src": "https://picsum.photos/seed/formulas/800/400", "legenda": "Figuras com as fórmulas principais." },
    { "tipo": "link", "rotulo": "Explorar no GeoGebra", "tipoLink": "externo", "url": "https://www.geogebra.org/" },
    { "tipo": "mermaid", "diagrama": "flowchart TD\\n  A[Fórmula] --> B{Precisa de área?}\\n  B -->|sim| C[multiplica e divide]\\n  B -->|não| D[confere o enunciado]", "tema": "neutral" }
  ]
}`;

// Atividade com nota automática: o gabarito fica no servidor e o aluno responde
// com radio (uma correta) ou checkbox (várias). Dissertativa fica fora da nota.
export const EXEMPLO_EXERCICIO = `{
  "conteudo": "exercicio",
  "titulo": "Avaliação — Função afim",
  "descricao": "Atividade para o aluno responder e receber a nota automática.",
  "blocos": [
    { "tipo": "titulo", "texto": "Instruções", "nivel": 1 },
    { "tipo": "texto", "conteudo": "Resolva as questões a seguir. A dissertativa não entra na nota automática." },
    {
      "tipo": "exercicio",
      "pergunta": "Em f(x) = 3x − 6, qual é a raiz?",
      "alternativas": ["2", "−2", "3", "6"],
      "selecao": "radio",
      "correta": 0,
      "explicacao": "3x − 6 = 0 ⇒ x = 2."
    },
    {
      "tipo": "exercicio",
      "pergunta": "Quais pontos pertencem ao gráfico de f(x) = 2x?",
      "alternativas": ["(1, 2)", "(2, 4)", "(3, 5)", "(0, 0)"],
      "selecao": "checkbox",
      "correta": [0, 1, 3],
      "explicacao": "y tem que ser o dobro de x."
    },
    { "tipo": "dissertativa", "pergunta": "Explique a diferença entre coeficiente angular e linear.", "orientacao": "Máximo de 5 linhas." },
    { "tipo": "formula", "latex": "f(x) = ax + b", "destaque": false }
  ]
}`;

// Quiz estilo Kahoot: perguntas com 2 a 4 alternativas, a correta e o tempo.
export const EXEMPLO_QUIZ = `{
  "conteudo": "quiz",
  "titulo": "Quiz — Revisão de Funções",
  "descricao": "Para a sala ao vivo: quanto mais rápido, mais pontos.",
  "perguntas": [
    { "pergunta": "Qual é o coeficiente angular de f(x) = 2x + 1?", "alternativas": ["1", "2", "3", "4"], "correta": 1, "tempo": 20 },
    { "pergunta": "A função f(x) = −3x é crescente?", "alternativas": ["Sim", "Não"], "correta": 1, "tempo": 15 },
    { "pergunta": "Qual é a raiz de f(x) = 3x − 6?", "alternativas": ["x = 2", "x = −2", "x = 0"], "correta": 0, "tempo": 15 }
  ]
}`;

export type ExemploImportacao = {
	conteudo: Importacao['conteudo'];
	rotulo: string;
	descricao: string;
	json: string;
};

// A página itera sobre isso para montar o botão + popup de cada tipo. O rótulo
// vem do `ROTULO_TIPO_IMPORTACAO` para não divergir do resto da UI ("exercicio"
// é "Atividade", "anexo" é "Anexo").
export const EXEMPLOS_IMPORTACAO: ExemploImportacao[] = (
	[
		{
			conteudo: 'apostila',
			descricao:
				'Estrutura completa: seções, aulas e todos os 11 tipos de bloco (título, texto, código, diagrama, imagem, link, tabela, fórmula, exercício, dissertativa e simulação).'
		},
		{
			conteudo: 'anexo',
			descricao:
				'Material solto que o aluno abre por link dentro de uma aula. Mostra título, texto, fórmula, tabela, código, imagem, link externo e diagrama.'
		},
		{
			conteudo: 'exercicio',
			descricao:
				'Avaliação com nota automática: múltipla escolha (uma ou várias corretas) e dissertativa. A atividade precisa de ao menos um bloco de exercício ou dissertativa para poder ser criada.'
		},
		{
			conteudo: 'quiz',
			descricao:
				'Perguntas para a sala ao vivo (estilo Kahoot): 2 a 4 alternativas, a correta e o tempo de cada pergunta.'
		}
	] satisfies { conteudo: Importacao['conteudo']; descricao: string }[]
).map((exemplo) => ({
	...exemplo,
	rotulo: ROTULO_TIPO_IMPORTACAO[exemplo.conteudo],
	json:
		exemplo.conteudo === 'apostila'
			? EXEMPLO_APOSTILA
			: exemplo.conteudo === 'anexo'
				? EXEMPLO_ANEXO
				: exemplo.conteudo === 'exercicio'
					? EXEMPLO_EXERCICIO
					: EXEMPLO_QUIZ
}));