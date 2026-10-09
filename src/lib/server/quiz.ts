// Quiz estilo Kahoot: só o quiz (título + perguntas) é persistido. A partida em
// si (sala, jogadores, ranking) vive em memória no `quiz-sala.ts` e não é salva.

import { error } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import {
	LIMITE_TITULO,
	normalizarPerguntas,
	validarPerguntas,
	type Quiz,
	type QuizUi
} from '$lib/quiz';
import { db } from '$lib/server/db';
import { quizzes } from '$lib/server/db/schema';
import type { Falha } from '$lib/server/conteudo';

function comPerguntas(linha: typeof quizzes.$inferSelect): Quiz {
	return { ...linha, perguntas: normalizarPerguntas(linha.perguntas) };
}

export async function buscarQuiz(quizId: number): Promise<Quiz> {
	const [linha] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
	if (!linha) throw error(404, 'Quiz não encontrado');
	return comPerguntas(linha);
}

export async function listarQuizzes(): Promise<QuizUi[]> {
	const lista = await db.select().from(quizzes).orderBy(asc(quizzes.titulo));
	return lista.map((linha) => ({
		id: linha.id,
		titulo: linha.titulo,
		descricao: linha.descricao,
		totalPerguntas: normalizarPerguntas(linha.perguntas).length,
		createdAt: linha.createdAt,
		updatedAt: linha.updatedAt
	}));
}

export async function criarQuiz() {
	const [quiz] = await db
		.insert(quizzes)
		.values({ titulo: 'Novo quiz', perguntas: [] })
		.returning();
	return quiz;
}

export async function salvarQuiz(quizId: number, dados: FormData): Promise<Falha | null> {
	const titulo = String(dados.get('titulo') ?? '')
		.trim()
		.slice(0, LIMITE_TITULO);
	if (!titulo) return { erro: 'Informe o título do quiz.', status: 400 };

	let perguntas;
	try {
		perguntas = normalizarPerguntas(JSON.parse(String(dados.get('perguntas') ?? '[]')));
	} catch {
		return { erro: 'As perguntas enviadas são inválidas.', status: 400 };
	}

	const pendencia = validarPerguntas(perguntas);
	if (pendencia) return { erro: pendencia, status: 400 };

	await db
		.update(quizzes)
		.set({
			titulo,
			descricao: String(dados.get('descricao') ?? '').trim(),
			perguntas,
			updatedAt: new Date()
		})
		.where(eq(quizzes.id, quizId));

	return null;
}

export async function excluirQuiz(quizId: number): Promise<Falha | null> {
	const [alvo] = await db.select({ id: quizzes.id }).from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
	if (!alvo) return { erro: 'Quiz não encontrado.', status: 404 };

	await db.delete(quizzes).where(eq(quizzes.id, quizId));
	return null;
}
