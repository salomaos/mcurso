// Importação de conteúdo por JSON no servidor: parte da onde o parser
// client-safe parou. Resolve os alvos lógicos dos links (`alvoTitulo`/
// `alvoOrdem`/`alvoId`) para ids reais, descarta o que não valida e grava.
// Apostila é transacional: tudo ou nada, e os links entre aulas apontam para a
// própria apostila nova (por isso a aula é inserida antes com blocos vazios e
// os blocos são gravados num segundo passe, com os ids já conhecidos).

import { eq } from 'drizzle-orm';
import { asc } from 'drizzle-orm';
import {
	agruparPorSecao,
	mesmoNomeSecao,
	novoId,
	normalizarBlocos,
	type Bloco,
	type Blocos
} from '$lib/blocks';
import type {
	ImportacaoApostila,
	ImportacaoAula,
	ImportacaoBloco,
	ImportacaoSolto
} from '$lib/importar';
import {
	LIMITE_TITULO,
	normalizarPerguntas,
	validarPerguntas,
	type ImportacaoQuiz
} from '$lib/quiz';
import { db } from '$lib/server/db';
import {
	anexos,
	apostilas,
	aulas,
	exercicios,
	quizzes,
	secoes
} from '$lib/server/db/schema';
import { transacao } from '$lib/server/db/transacao';
import type { Falha } from '$lib/server/conteudo';

class ErroImport extends Error {}

// Chave de comparação de título sem acento/caixa (mesma ideia do `mesmoNomeSecao`,
// porém em chave de Map para o alvo por título ser O(1)).
function chaveTitulo(titulo: string): string {
	return titulo.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function mesmoTitulo(a: string, b: string): boolean {
	return mesmoNomeSecao(a, b);
}

type AlvosSolto = {
	aulas: Map<number, true>;
	anexos: Map<number, true>;
	anexosPorTitulo: Map<string, number>;
	exercicios: Map<number, true>;
	exerciciosPorTitulo: Map<string, number>;
};

function porTitulo(lista: { id: number; titulo: string }[]): Map<string, number> {
	const mapa = new Map<string, number>();
	for (const item of lista) {
		const chave = chaveTitulo(item.titulo);
		if (!mapa.has(chave)) mapa.set(chave, item.id);
	}
	return mapa;
}

async function carregarAlvosSoltos(): Promise<AlvosSolto> {
	const [listaAnexos, listaExercicios, listaAulas] = await Promise.all([
		db.select({ id: anexos.id, titulo: anexos.titulo }).from(anexos),
		db.select({ id: exercicios.id, titulo: exercicios.titulo }).from(exercicios),
		db.select({ id: aulas.id }).from(aulas)
	]);
	return {
		aulas: new Map(listaAulas.map((aula) => [aula.id, true])),
		anexos: new Map(listaAnexos.map((anexo) => [anexo.id, true])),
		anexosPorTitulo: porTitulo(listaAnexos),
		exercicios: new Map(listaExercicios.map((exercicio) => [exercicio.id, true])),
		exerciciosPorTitulo: porTitulo(listaExercicios)
	};
}

// Ids de bloco são chave do editor/estado e a dificilmente a IA manda os
// mesmos (ou únicos). Regenera os que faltam ou repetem — o JSON da IA não
// precisa de `id` nenhum.
function garantirIds(blocos: ImportacaoBloco[]): ImportacaoBloco[] {
	const usados = new Set<string>();
	return blocos.map((bloco) => {
		const id = bloco.id;
		const valido = typeof id === 'string' && id !== '' && !usados.has(id);
		const idFinal = valido ? id : novoId();
		usados.add(idFinal);
		return valido ? bloco : { ...bloco, id: idFinal };
	});
}

function blocoLink(bloco: ImportacaoBloco, alvo: { alvoId: number } | { url: string }): ImportacaoBloco {
	return {
		id: bloco.id,
		tipo: 'link',
		rotulo: typeof bloco.rotulo === 'string' ? bloco.rotulo : '',
		tipoLink: bloco.tipoLink,
		...('alvoId' in alvo ? { alvoId: alvo.alvoId } : { url: alvo.url })
	};
}

function rotuloDoLink(bloco: ImportacaoBloco): string {
	return typeof bloco.rotulo === 'string' ? bloco.rotulo : '';
}

function alvoAula(
	bloco: ImportacaoBloco,
	aulas: { titulo: string }[],
	idAulaPorPos: (pos: number) => number
): { ok: number } | Falha {
	const rotulo = rotuloDoLink(bloco);
	if (Number.isInteger(bloco.alvoOrdem)) {
		const pos = Number(bloco.alvoOrdem) - 1;
		if (pos >= 0 && pos < aulas.length) return { ok: idAulaPorPos(pos) };
		return {
			erro: `O link "${rotulo}" aponta para a aula de ordem ${Number(bloco.alvoOrdem)}, mas a apostila tem ${aulas.length} aula(s).`,
			status: 400
		};
	}
	const titulo = typeof bloco.alvoTitulo === 'string' ? bloco.alvoTitulo.trim() : '';
	if (titulo) {
		const pos = aulas.findIndex((aula) => mesmoTitulo(aula.titulo, titulo));
		if (pos >= 0) return { ok: idAulaPorPos(pos) };
		return {
			erro: `Não achei a aula "${titulo}" para o link "${rotulo}": confira o título no JSON (a aula precisa existir na própria apostila).`,
			status: 400
		};
	}
	return {
		erro: `O link "${rotulo}" é interno mas não diz o alvo: use "alvoTitulo" (título de uma aula do JSON) ou "alvoOrdem" (posição 1-based na lista).`,
		status: 400
	};
}

function alvoSolto(
	bloco: ImportacaoBloco,
	tipo: 'anexo' | 'exercicio',
	soltos: AlvosSolto
): { ok: number } | Falha {
	const rotulo = rotuloDoLink(bloco);
	const porId = tipo === 'anexo' ? soltos.anexos : soltos.exercicios;
	const porTitulo = tipo === 'anexo' ? soltos.anexosPorTitulo : soltos.exerciciosPorTitulo;
	const nomeMenor = tipo === 'anexo' ? 'anexo' : 'atividade';
	const nomeMaior = tipo === 'anexo' ? 'um anexo' : 'uma atividade';

	if (Number.isInteger(bloco.alvoId) && Number(bloco.alvoId) > 0) {
		const id = Number(bloco.alvoId);
		if (!porId.has(id)) {
			return { erro: `O ${nomeMenor} ${id} do link "${rotulo}" não existe.`, status: 400 };
		}
		return { ok: id };
	}

	const titulo = typeof bloco.alvoTitulo === 'string' ? bloco.alvoTitulo.trim() : '';
	if (titulo) {
		const id = porTitulo.get(chaveTitulo(titulo));
		if (id === undefined) {
			return {
				erro: `Não achei ${nomeMaior} chamada "${titulo}" para o link "${rotulo}". O conteúdo precisa existir antes (crie ou use "alvoId").`,
				status: 400
			};
		}
		return { ok: id };
	}

	return {
		erro: `O link "${rotulo}" está sem alvo: use "alvoId" (id já existente) ou "alvoTitulo" (título de um conteúdo existente).`,
		status: 400
	};
}

function isAlvoId(valor: unknown): valor is number {
	return Number.isInteger(valor) && Number(valor) > 0;
}

// Converte blocos crus do JSON em `Blocos` finais. Aula depende do contexto:
// com `aulas` é a importação de apostila (resolve por título/ordem na própria
// lista, alvoId de aula é recusado — a apostila é nova); sem `aulas` é conteúdo
// solto (aula só por id de aula já existente, título/ordem não tem onde cair).
function resolverLinks(
	blocos: ImportacaoBloco[],
	opcoes: {
		aulas?: { titulo: string }[];
		idAulaPorPos?: (pos: number) => number;
		soltos: AlvosSolto;
	}
): { blocos: Blocos } | Falha {
	const comId = garantirIds(blocos);
	const resolvidos: ImportacaoBloco[] = [];

	for (const bloco of comId) {
		if (bloco.tipo !== 'link') {
			resolvidos.push(bloco);
			continue;
		}
		const tipoLink = String(bloco.tipoLink ?? '');
		if (tipoLink === 'externo') {
			resolvidos.push(blocoLink(bloco, { url: typeof bloco.url === 'string' ? bloco.url : '' }));
			continue;
		}
		if (tipoLink === 'aula') {
			if (opcoes.aulas) {
				if (isAlvoId(bloco.alvoId) && bloco.alvoTitulo === undefined && bloco.alvoOrdem === undefined) {
					return {
						erro: `O link "${rotuloDoLink(bloco)}" aponta para uma aula por id: dentro do JSON de apostila use "alvoTitulo" (título de uma aula do próprio JSON) ou "alvoOrdem" (posição na lista).`,
						status: 400
					};
				}
				const alvo = alvoAula(bloco, opcoes.aulas, opcoes.idAulaPorPos ?? (() => 0));
				if ('erro' in alvo) return alvo;
				resolvidos.push(blocoLink(bloco, { alvoId: alvo.ok }));
				continue;
			}
			// Conteúdo solto: link de aula só por id de aula já existente.
			if (bloco.alvoTitulo !== undefined || bloco.alvoOrdem !== undefined) {
				return {
					erro: `O link "${rotuloDoLink(bloco)}" aponta para uma aula por título/ordem: fora de uma apostila use "alvoId" de uma aula existente.`,
					status: 400
				};
			}
			if (!isAlvoId(bloco.alvoId)) {
				return { erro: `O link "${rotuloDoLink(bloco)}" não diz o alvo.`, status: 400 };
			}
			const id = Number(bloco.alvoId);
			if (!opcoes.soltos.aulas.has(id)) {
				return { erro: `A aula ${id} do link "${rotuloDoLink(bloco)}" não existe.`, status: 400 };
			}
			resolvidos.push(blocoLink(bloco, { alvoId: id }));
			continue;
		}
		if (tipoLink === 'anexo' || tipoLink === 'exercicio') {
			const alvo = alvoSolto(bloco, tipoLink, opcoes.soltos);
			if ('erro' in alvo) return alvo;
			resolvidos.push(blocoLink(bloco, { alvoId: alvo.ok }));
			continue;
		}
		// tipoLink fora da lista: deixa o normalizador descartar (ehBloco).
		resolvidos.push(bloco);
	}

	return { blocos: normalizarBlocos(resolvidos) };
}

export async function importarApostila(dados: ImportacaoApostila): Promise<{ id: number } | Falha> {
	const titulo = dados.titulo.trim();
	const descricao = dados.descricao.trim();
	if (!titulo) return { erro: 'Informe o título da apostila.', status: 400 };

	// Lista plana de aulas na ordem final, com a seção (nome) a que pertencem.
	const aulasPlanas: { aula: ImportacaoAula; secao: string | null }[] = [];
	for (const secao of dados.secoes) {
		for (const aula of secao.aulas) aulasPlanas.push({ aula, secao: secao.nome });
	}
	for (const aula of dados.aulas) aulasPlanas.push({ aula, secao: null });
	if (aulasPlanas.length === 0) {
		return { erro: 'A apostila precisa de ao menos uma aula.', status: 400 };
	}

	// Alvos soltos (anexo/atividade) vêm do banco: resolução é O(1) por mapa.
	const soltos = await carregarAlvosSoltos();

	let criada: { id: number } | null = null;
	try {
		await transacao((tx): void => {
			// Apostila e, depois, seções únicas na ordem de primeira aparição.
			const [apostila] = tx
				.insert(apostilas)
				.values({ titulo, descricao })
				.returning()
				.all();
			const secaoIdPorChave = new Map<string, number>();
			let ordemSecao = 0;
			for (const secao of dados.secoes) {
				const chave = chaveTitulo(secao.nome);
				if (secaoIdPorChave.has(chave)) continue;
				const [linha] = tx
					.insert(secoes)
					.values({ apostilaId: apostila.id, nome: secao.nome, ordem: ordemSecao })
					.returning()
					.all();
				secaoIdPorChave.set(chave, linha.id);
				ordemSecao += 1;
			}

			// Passo 1: aulas com blocos vazios — os ids de hoje são os alvos dos
			// links de `alvoOrdem` do JSON, então a ordem da lista é sagrada.
			const ids = new Array<number>(aulasPlanas.length);
			aulasPlanas.forEach((entrada, pos) => {
				const secaoId = entrada.secao ? (secaoIdPorChave.get(chaveTitulo(entrada.secao)) ?? null) : null;
				const [linha] = tx
					.insert(aulas)
					.values({
						apostilaId: apostila.id,
						secaoId,
						titulo: entrada.aula.titulo,
						descricao: entrada.aula.descricao,
						ordem: pos,
						blocos: []
					})
					.returning()
					.all();
				ids[pos] = linha.id;
			});

			// Passo 2: resolve os links (aula → id já conhecido) e grava blocos.
			const rotulosAulas = aulasPlanas.map((entrada) => ({ titulo: entrada.aula.titulo }));
			aulasPlanas.forEach((entrada, pos) => {
				const resultado = resolverLinks(entrada.aula.blocos, {
					aulas: rotulosAulas,
					idAulaPorPos: (p) => ids[p],
					soltos
				});
				if ('erro' in resultado) throw new ErroImport(resultado.erro);
				tx.update(aulas).set({ blocos: resultado.blocos }).where(eq(aulas.id, ids[pos])).run();
			});

			criada = { id: apostila.id };
		});
	} catch (erro) {
		if (erro instanceof ErroImport) return { erro: erro.message, status: 400 };
		throw erro;
	}

	return criada ?? { erro: 'A apostila não pôde ser criada.', status: 500 };
}

async function importarSolto(
	tipo: 'anexo' | 'exercicio',
	dados: ImportacaoSolto
): Promise<{ id: number } | Falha> {
	const titulo = dados.titulo.trim();
	if (!titulo) return { erro: 'Informe o título do conteúdo.', status: 400 };

	const soltos = await carregarAlvosSoltos();
	const resultado = resolverLinks(dados.blocos, { soltos });
	if ('erro' in resultado) return resultado;

	const tabela = tipo === 'anexo' ? anexos : exercicios;
	const [linha] = await db
		.insert(tabela)
		.values({ titulo, descricao: dados.descricao.trim(), blocos: resultado.blocos })
		.returning();
	return { id: linha.id };
}

export function importarAnexo(dados: ImportacaoSolto) {
	return importarSolto('anexo', dados);
}

export function importarExercicio(dados: ImportacaoSolto) {
	return importarSolto('exercicio', dados);
}

export async function importarQuiz(quiz: ImportacaoQuiz): Promise<{ id: number } | Falha> {
	const titulo = (quiz.titulo ?? '').trim().slice(0, LIMITE_TITULO);
	if (!titulo) return { erro: 'Informe o título do quiz.', status: 400 };

	const perguntas = normalizarPerguntas(quiz.perguntas);
	const pendencia = validarPerguntas(perguntas);
	if (pendencia) return { erro: pendencia, status: 400 };

	const [linha] = await db
		.insert(quizzes)
		.values({ titulo, descricao: (quiz.descricao ?? '').trim(), perguntas })
		.returning();
	return { id: linha.id };
}

// Guarda de tipo: `Bloco` aqui é só para documentar o retorno do `normalizarBlocos`.
export type { Bloco };

// --- Exportação (round-trip) -------------------------------------------------
//
// Devolve o conteúdo atual no formato canônico do importar (o mesmo parser da
// página), para colar/guardar/reimportar ou mandar de volta para a IA ajustar.
// Links internos saem SEM `alvoId`: aula vira `alvoTitulo` (resolve dentro da
// própria apostila, mesmo se o JSON for para outro lugar), e anexo/atividade
// viram `alvoTitulo` do conteúdo existente. É isso que mantém o round-trip.
export type ConteudoExportado = {
	json: string;
	importavel: boolean;
};

type TitulosPorTipo = {
	aulas: Map<number, string>;
	anexos: Map<number, string>;
	exercicios: Map<number, string>;
};

async function carregarTitulos(apostilaId: number | null): Promise<TitulosPorTipo> {
	const [aulasLista, anexosLista, exerciciosLista] = await Promise.all([
		apostilaId === null
			? Promise.resolve([] as { id: number; titulo: string }[])
			: db
					.select({ id: aulas.id, titulo: aulas.titulo })
					.from(aulas)
					.where(eq(aulas.apostilaId, apostilaId)),
		db.select({ id: anexos.id, titulo: anexos.titulo }).from(anexos),
		db.select({ id: exercicios.id, titulo: exercicios.titulo }).from(exercicios)
	]);
	const novo = (lista: { id: number; titulo: string }[]) =>
		new Map(lista.map((item) => [item.id, item.titulo]));
	return { aulas: novo(aulasLista), anexos: novo(anexosLista), exercicios: novo(exerciciosLista) };
}

function blocosParaExportar(blocos: Blocos, titulos: TitulosPorTipo): ImportacaoBloco[] {
	return blocos.map((bloco) => {
		if (bloco.tipo !== 'link' || bloco.tipoLink === 'externo') {
			return { ...bloco } as unknown as ImportacaoBloco;
		}
		const mapa =
			bloco.tipoLink === 'aula'
				? titulos.aulas
				: bloco.tipoLink === 'anexo'
					? titulos.anexos
					: titulos.exercicios;
		const alvoTitulo = bloco.alvoId !== undefined ? mapa.get(bloco.alvoId) : undefined;
		const saida: ImportacaoBloco = {
			id: bloco.id,
			tipo: 'link',
			rotulo: bloco.rotulo,
			tipoLink: bloco.tipoLink
		};
		if (alvoTitulo) saida.alvoTitulo = alvoTitulo;
		return saida;
	});
}

export async function exportarApostilaJson(apostilaId: number): Promise<ConteudoExportado | Falha> {
	const [apostila] = await db
		.select()
		.from(apostilas)
		.where(eq(apostilas.id, apostilaId))
		.limit(1);
	if (!apostila) return { erro: 'Apostila não encontrada.', status: 404 };

	const [listaSecoes, listaAulas, titulos] = await Promise.all([
		db
			.select()
			.from(secoes)
			.where(eq(secoes.apostilaId, apostilaId))
			.orderBy(asc(secoes.ordem), asc(secoes.id)),
		db
			.select()
			.from(aulas)
			.where(eq(aulas.apostilaId, apostilaId))
			.orderBy(asc(aulas.ordem), asc(aulas.id)),
		carregarTitulos(apostilaId)
	]);

	// Mesmo agrupamento do painel (aula com seção presente cai na seção; sem
	// seção, no `aulas` solto), para o JSON voltar com a estrutura de origem.
	const aulasUi = listaAulas.map((aula) => ({
		id: aula.id,
		apostilaId: aula.apostilaId,
		titulo: aula.titulo,
		descricao: aula.descricao,
		secaoId: aula.secaoId,
		ordem: aula.ordem
	}));
	const blocosPorId = new Map(
		listaAulas.map((aula) => [aula.id, blocosParaExportar(aula.blocos as Blocos, titulos)])
	);
	const exportarAula = (aula: (typeof aulasUi)[number]) => ({
		titulo: aula.titulo,
		descricao: aula.descricao ?? '',
		blocos: blocosPorId.get(aula.id) ?? []
	});

	const grupos = agruparPorSecao(listaSecoes, aulasUi);
	const secoesExportadas = grupos
		.filter((grupo) => grupo.secao !== null)
		.map((grupo) => ({
			nome: grupo.secao!.nome,
			aulas: grupo.aulas.map(exportarAula)
		}));
	const aulasSoltas = (grupos.find((grupo) => grupo.secao === null)?.aulas ?? []).map(exportarAula);

	const dados: ImportacaoApostila = {
		conteudo: 'apostila',
		titulo: apostila.titulo,
		descricao: apostila.descricao ?? '',
		secoes: secoesExportadas,
		aulas: aulasSoltas
	};

	return {
		json: JSON.stringify(dados, null, 2),
		importavel:
			aulasSoltas.length > 0 || secoesExportadas.some((secao) => secao.aulas.length > 0)
	};
}

export async function exportarSoltoJson(
	tipo: 'anexo' | 'exercicio',
	id: number
): Promise<ConteudoExportado | Falha> {
	const tabela = tipo === 'anexo' ? anexos : exercicios;
	const [linhas, titulos] = await Promise.all([
		db.select().from(tabela).where(eq(tabela.id, id)).limit(1),
		carregarTitulos(null)
	]);
	const linha = linhas[0];
	if (!linha) return { erro: 'Conteúdo não encontrado.', status: 404 };

	const dados: ImportacaoSolto = {
		conteudo: tipo,
		titulo: linha.titulo,
		descricao: linha.descricao ?? '',
		blocos: blocosParaExportar(linha.blocos as Blocos, titulos)
	};
	return { json: JSON.stringify(dados, null, 2), importavel: true };
}

export async function exportarQuizJson(quizId: number): Promise<ConteudoExportado | Falha> {
	const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
	if (!quiz) return { erro: 'Quiz não encontrado.', status: 404 };

	const dados = {
		conteudo: 'quiz',
		titulo: quiz.titulo,
		descricao: quiz.descricao ?? '',
		perguntas: normalizarPerguntas(quiz.perguntas)
	};
	return { json: JSON.stringify(dados, null, 2), importavel: true };
}