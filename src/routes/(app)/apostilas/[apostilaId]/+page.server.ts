import { error, fail, redirect } from '@sveltejs/kit';
import { asc, eq, max } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { apostilas, aulas } from '$lib/server/db/schema';
import { requerSessao } from '$lib/server/guard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const id = Number(event.params.apostilaId);

	const [apostila] = await db
		.select()
		.from(apostilas)
		.where(eq(apostilas.id, id))
		.limit(1);
	if (!apostila) throw error(404, 'Apostila não encontrada');

	const listaAulas = await db
		.select()
		.from(aulas)
		.where(eq(aulas.apostilaId, id))
		.orderBy(asc(aulas.ordem), asc(aulas.id));

	return { apostila, aulas: listaAulas };
};

export const actions: Actions = {
	renomear: async (event) => {
		requerSessao(event);
		const id = Number(event.params.apostilaId);
		const dados = await event.request.formData();
		const titulo = String(dados.get('titulo') ?? '').trim();
		if (!titulo) return fail(400, { erro: 'Informe um título.' });
		await db
			.update(apostilas)
			.set({
				titulo,
				descricao: String(dados.get('descricao') ?? '').trim(),
				updatedAt: new Date()
			})
			.where(eq(apostilas.id, id));
		return { ok: true };
	},

	criarAula: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);
		const dados = await event.request.formData();
		const titulo = String(dados.get('titulo') ?? '').trim();
		const secao = String(dados.get('secao') ?? '').trim() || null;

		if (!titulo) return fail(400, { erroAula: 'Informe o título da aula.' });

		const [linha] = await db
			.select({ max: max(aulas.ordem) })
			.from(aulas)
			.where(eq(aulas.apostilaId, apostilaId));

		const [nova] = await db
			.insert(aulas)
			.values({ apostilaId, titulo, secao, ordem: (linha?.max ?? 0) + 1 })
			.returning();

		throw redirect(303, `/apostilas/${apostilaId}/aulas/${nova.id}/editar`);
	},

	moverAula: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);
		const dados = await event.request.formData();
		const aulaId = Number(dados.get('aulaId') ?? '');
		const direcao = dados.get('direcao') === 'cima' ? -1 : 1;

		const lista = await db
			.select({ id: aulas.id, ordem: aulas.ordem })
			.from(aulas)
			.where(eq(aulas.apostilaId, apostilaId))
			.orderBy(asc(aulas.ordem), asc(aulas.id));

		const idx = lista.findIndex((a) => a.id === aulaId);
		const vizinho = idx + direcao;
		if (idx === -1 || vizinho < 0 || vizinho >= lista.length) return { erro: 'Movimento inválido' };

		await db
			.transaction(async (tx) => {
				await tx
					.update(aulas)
					.set({ ordem: lista[vizinho].ordem })
					.where(eq(aulas.id, lista[idx].id));
				await tx
					.update(aulas)
					.set({ ordem: lista[idx].ordem })
					.where(eq(aulas.id, lista[vizinho].id));
			});

		return { ok: true };
	},

	excluirAula: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);
		const dados = await event.request.formData();
		const aulaId = Number(dados.get('aulaId') ?? '');
		await db.delete(aulas).where(eq(aulas.id, aulaId));
		return { ok: true };
	},

	excluir: async (event) => {
		requerSessao(event);
		const id = Number(event.params.apostilaId);
		await db.delete(apostilas).where(eq(apostilas.id, id));
		throw redirect(303, '/apostilas');
	}
};