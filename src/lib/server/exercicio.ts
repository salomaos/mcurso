// Atividade de exercícios: conteúdo solto (como o anexo), montado com os
// mesmos blocos. A parte pública é diferente de aula/anexo: o servidor entrega
// as questões **sem gabarito** e compara as respostas no POST.

import { createHash } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import {
	corretasDoExercicio,
	linksPara,
	normalizarBlocos,
	type Blocos
} from '$lib/blocks';
import { dissertativasPublicas, questoesPublicas } from '$lib/corrigir';
import type {
	AlvoLink,
	DissertativaPublica,
	ExercicioUi,
	QuestaoPublica,
	ReferenciaAnexo
} from '$lib/conteudo';
import { db } from '$lib/server/db';
import { inserirId } from '$lib/server/db/inserir';
import { apostilas, aulas, exercicios } from '$lib/server/db/tabelas';
import { erroNaoEncontrado, lerConteudo, validarLinksInternos, type Falha } from '$lib/server/conteudo';

export type { DissertativaPublica, ExercicioUi, QuestaoPublica, ReferenciaAnexo };

function comBlocos(linha: typeof exercicios.$inferSelect) {
	return { ...linha, blocos: normalizarBlocos(linha.blocos as Blocos) };
}

export async function buscarExercicio(exercicioId: number) {
	const [linha] = await db.select().from(exercicios).where(eq(exercicios.id, exercicioId)).limit(1);
	if (!linha) throw erroNaoEncontrado('exercicio');
	return comBlocos(linha);
}

// Blocos de apoio (instruções, imagens, fórmulas...), as questões objetivas e as
// dissertativas, na ordem do canvas. `exercicio.blocos` é a única fonte: não
// existe tabela de questões.
export function separarExercicio(blocos: Blocos) {
	return {
		instrucoes: blocos.filter(
			(bloco) => bloco.tipo !== 'exercicio' && bloco.tipo !== 'dissertativa'
		),
		questoes: blocos.filter((bloco) => bloco.tipo === 'exercicio'),
		dissertativas: blocos.filter((bloco) => bloco.tipo === 'dissertativa')
	};
}

// Aulas (de qualquer apostila) que apontam para a atividade.
export async function referenciasDoExercicio(exercicioId: number): Promise<ReferenciaAnexo[]> {
	const lista = await db
		.select({ id: aulas.id, titulo: aulas.titulo, apostilaId: aulas.apostilaId, blocos: aulas.blocos })
		.from(aulas);

	return lista
		.filter(
			(aula) => linksPara(normalizarBlocos(aula.blocos as Blocos), { tipo: 'exercicio', id: exercicioId }).length > 0
		)
		.map((aula) => ({ id: aula.id, titulo: aula.titulo, apostilaId: aula.apostilaId }));
}

export async function listarExercicios(): Promise<ExercicioUi[]> {
	const [listaExercicios, listaAulas] = await Promise.all([
		db.select().from(exercicios).orderBy(asc(exercicios.titulo)),
		db
			.select({ id: aulas.id, titulo: aulas.titulo, apostilaId: aulas.apostilaId, blocos: aulas.blocos })
			.from(aulas)
	]);

	const porExercicio = new Map<number, ReferenciaAnexo[]>();
	for (const aula of listaAulas) {
		const blocos = normalizarBlocos(aula.blocos as Blocos);
		const ids = new Set(
			blocos
				.filter((bloco) => bloco.tipo === 'link' && bloco.tipoLink === 'exercicio')
				.map((bloco) => (bloco.tipo === 'link' ? bloco.alvoId : null))
				.filter((id): id is number => id !== null && id !== undefined)
		);
		for (const id of ids) {
			const lista = porExercicio.get(id) ?? [];
			lista.push({ id: aula.id, titulo: aula.titulo, apostilaId: aula.apostilaId });
			porExercicio.set(id, lista);
		}
	}

	return listaExercicios.map((linha) => {
		const { questoes, dissertativas } = separarExercicio(normalizarBlocos(linha.blocos as Blocos));
		return {
			...linha,
			questoes: questoes.length,
			discursivas: dissertativas.length,
			referencias: porExercicio.get(linha.id) ?? []
		};
	});
}

export async function alvosExercicios(): Promise<AlvoLink[]> {
	const lista = await db
		.select({ id: exercicios.id, titulo: exercicios.titulo, descricao: exercicios.descricao })
		.from(exercicios)
		.orderBy(asc(exercicios.titulo));
	return lista.map((exercicio) => ({ id: exercicio.id, titulo: exercicio.titulo, detalhe: exercicio.descricao }));
}

// Cria a atividade vazia e devolve o id (é o que a action usa para redirecionar).
export async function criarExercicio(): Promise<number> {
	return inserirId(db.insert(exercicios).values({ titulo: 'Nova atividade' }));
}

export async function salvarExercicio(exercicioId: number, dados: FormData): Promise<Falha | null> {
	const conteudo = lerConteudo(dados, 'exercicio');
	if ('erro' in conteudo) return conteudo;

	// Atividade sem pergunta nenhuma não faz sentido: o aluno não teria o que
	// responder. Vale uma só dissertativa, então a exigência é "alguma coisa".
	const { questoes, dissertativas } = separarExercicio(conteudo.blocos);
	if (questoes.length === 0 && dissertativas.length === 0) {
		return { erro: 'Adicione um bloco de exercício ou de dissertativa à atividade.', status: 400 };
	}

	const falhaLink = await validarLinksInternos(conteudo.blocos, {});
	if (falhaLink) return falhaLink;

	await db
		.update(exercicios)
		.set({
			titulo: conteudo.titulo,
			descricao: conteudo.descricao,
			blocos: conteudo.blocos,
			updatedAt: new Date()
		})
		.where(eq(exercicios.id, exercicioId));

	return null;
}

// Atividade em uso não pode ser excluída: os links das aulas ficariam quebrados.
export async function excluirExercicio(exercicioId: number): Promise<Falha | null> {
	const [alvo] = await db
		.select({ id: exercicios.id })
		.from(exercicios)
		.where(eq(exercicios.id, exercicioId))
		.limit(1);
	if (!alvo) return { erro: 'Atividade não encontrada.', status: 404 };

	const referencias = await referenciasDoExercicio(exercicioId);
	if (referencias.length > 0) {
		const lista = referencias.map((ref) => `"${ref.titulo}"`).join(', ');
		return {
			erro: `Esta atividade é usada em ${referencias.length} aula(s): ${lista}. Remova os links antes de excluir.`,
			status: 409
		};
	}

	await db.delete(exercicios).where(eq(exercicios.id, exercicioId));
	return null;
}

// --- Parte pública -------------------------------------------------------
//
// A página do aluno é pública, então o gabarito não pode existir no payload
// que o SSR entrega: `correta` e `explicacao` saem do objeto antes da
// serialização. A correção acontece só aqui, no POST.

// Página pública: instruções (blocos de apoio) + questões sem resposta.
// O payload das questões/dissertativas é montado em `$lib/corrigir` (mesma regra do
// gabarito) — `correta` e `explicacao` não entram.
export async function buscarExercicioPublico(exercicioId: number) {
	const linha = await buscarExercicio(exercicioId);
	const { instrucoes } = separarExercicio(linha.blocos);

	return {
		id: linha.id,
		titulo: linha.titulo,
		descricao: linha.descricao,
		instrucoes,
		questoes: questoesPublicas(linha.blocos),
		dissertativas: dissertativasPublicas(linha.blocos)
	};
}

// Respostas chegam como `q_<id da questão>` (e `d_<id>` na dissertativa) no
// FormData. Índice fora da faixa (ou ausente) vale como "não respondeu": não é
// erro de formulário, é zero. A correção vive em `$lib/corrigir` (puro, sem banco)
// para poder ser testada.
export { corrigirExercicio, dissertativasPublicas, questoesPublicas } from '$lib/corrigir';

// Resumo do gabarito na ordem das questões: a chave muda se o professor corrigir
// a atividade depois, e a validação percebe que a nota é antiga. `correta` vira
// lista, então `[0,2]|[1]` cobre uma e outra resposta certa.
export function hashGabarito(blocos: Blocos): string {
	const gabarito = blocos
		.filter((bloco) => bloco.tipo === 'exercicio')
		.map((bloco) => (bloco.tipo === 'exercicio' ? corretasDoExercicio(bloco).join('+') : ''))
		.join('|');
	return createHash('sha256').update(gabarito).digest('base64url').slice(0, 12);
}

// Contexto de origem registrado na chave do resultado: a atividade é solta, então
// a aula vem da query `?aula=` do link posto dentro da aula.
export type ContextoAtividade = {
	exercicio: { id: number; titulo: string };
	aula?: { id: number; titulo: string; apostilaId: number; apostilaTitulo: string };
};

export async function contextoAtividade(
	exercicio: { id: number; titulo: string },
	aulaIdDaUrl: string | null
): Promise<ContextoAtividade> {
	const aulaId = Number(aulaIdDaUrl ?? '');
	if (!Number.isInteger(aulaId) || aulaId <= 0) return { exercicio };

	const [linha] = await db
		.select({ id: aulas.id, titulo: aulas.titulo, apostilaId: aulas.apostilaId })
		.from(aulas)
		.where(eq(aulas.id, aulaId))
		.limit(1);
	if (!linha) return { exercicio };

	const [apostila] = await db
		.select({ titulo: apostilas.titulo })
		.from(apostilas)
		.where(eq(apostilas.id, linha.apostilaId))
		.limit(1);

	return {
		exercicio,
		aula: {
			id: linha.id,
			titulo: linha.titulo,
			apostilaId: linha.apostilaId,
			apostilaTitulo: apostila?.titulo ?? `Apostila ${linha.apostilaId}`
		}
	};
}
