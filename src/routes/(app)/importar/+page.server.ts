import { fail, redirect } from '@sveltejs/kit';
import { asc } from 'drizzle-orm';
import { caminhoAnexo, caminhoExercicio } from '$lib/conteudo';
import { interpretarImportacao } from '$lib/importar';
import { caminhoEditarQuiz } from '$lib/quiz';
import { db } from '$lib/server/db';
import { anexos, apostilas, aulas, exercicios, quizzes } from '$lib/server/db/schema';
import { requerSessao } from '$lib/server/guard';
import {
	exportarApostilaJson,
	exportarQuizJson,
	exportarSoltoJson,
	importarAnexo,
	importarApostila,
	importarExercicio,
	importarQuiz
} from '$lib/server/importar';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requerSessao(event);

	// Listas de seleção da exportação round-trip. Apostila sem aula não volta a
	// entrar no import (o parser exige ao menos uma), então ela sai da lista.
	const [listaApostilas, listaAnexos, listaExercicios, listaQuizzes, apostilasComAula] =
		await Promise.all([
			db.select({ id: apostilas.id, titulo: apostilas.titulo }).from(apostilas).orderBy(asc(apostilas.titulo)),
			db.select({ id: anexos.id, titulo: anexos.titulo }).from(anexos).orderBy(asc(anexos.titulo)),
			db.select({ id: exercicios.id, titulo: exercicios.titulo }).from(exercicios).orderBy(asc(exercicios.titulo)),
			db.select({ id: quizzes.id, titulo: quizzes.titulo }).from(quizzes).orderBy(asc(quizzes.titulo)),
			db
				.selectDistinct({ apostilaId: aulas.apostilaId })
				.from(aulas)
		]);
	const comAula = new Set(apostilasComAula.map((aula) => aula.apostilaId));

	return {
		exportaveis: {
			apostila: listaApostilas.filter((apostila) => comAula.has(apostila.id)),
			anexo: listaAnexos,
			exercicio: listaExercicios,
			quiz: listaQuizzes
		}
	};
};

export const actions: Actions = {
	criar: async (event) => {
		requerSessao(event);
		const dados = await event.request.formData();
		const texto = String(dados.get('json') ?? '');

		const resultado = interpretarImportacao(texto);
		if ('erro' in resultado) return fail(400, { erro: resultado.erro });

		switch (resultado.dados.conteudo) {
			case 'apostila': {
				const criada = await importarApostila(resultado.dados);
				if ('erro' in criada) return fail(criada.status, { erro: criada.erro });
				throw redirect(303, `/apostilas/${criada.id}`);
			}
			case 'anexo': {
				const criado = await importarAnexo(resultado.dados);
				if ('erro' in criado) return fail(criado.status, { erro: criado.erro });
				throw redirect(303, `${caminhoAnexo(criado.id)}/editar?novo=1`);
			}
			case 'exercicio': {
				const criado = await importarExercicio(resultado.dados);
				if ('erro' in criado) return fail(criado.status, { erro: criado.erro });
				throw redirect(303, `${caminhoExercicio(criado.id)}/editar?novo=1`);
			}
			case 'quiz': {
				const criado = await importarQuiz(resultado.dados.quiz);
				if ('erro' in criado) return fail(criado.status, { erro: criado.erro });
				throw redirect(303, caminhoEditarQuiz(criado.id));
			}
		}
	},

	exportar: async (event) => {
		requerSessao(event);
		const dados = await event.request.formData();
		const tipo = String(dados.get('tipo') ?? '');
		const id = Number(dados.get('id') ?? '');

		const resultado =
			tipo === 'apostila'
				? await exportarApostilaJson(id)
				: tipo === 'anexo' || tipo === 'exercicio'
					? await exportarSoltoJson(tipo, id)
					: tipo === 'quiz'
						? await exportarQuizJson(id)
						: { erro: 'Escolha o que exportar.', status: 400 };
		if ('erro' in resultado) return fail(resultado.status, { erro: resultado.erro });
		return { json: resultado.json, importavel: resultado.importavel };
	}
};