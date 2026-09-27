import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, eq, max } from 'drizzle-orm';
import {
	mesmoNomeSecao,
	normalizarBlocos,
	normalizarNomeSecao,
	type Blocos
} from '$lib/blocks';
import { db } from '$lib/server/db';
import { apostilas, aulas, secoes } from '$lib/server/db/schema';
import { requerSessao } from '$lib/server/guard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requerSessao(event);
	const apostilaId = Number(event.params.apostilaId);
	const aulaId = Number(event.params.aulaId);

	const [aula] = await db.select().from(aulas).where(eq(aulas.id, aulaId)).limit(1);
	if (!aula || aula.apostilaId !== apostilaId) throw error(404, 'Aula não encontrada');

	const [apostila] = await db
		.select()
		.from(apostilas)
		.where(eq(apostilas.id, apostilaId))
		.limit(1);

	const listaSecoes = await db
		.select()
		.from(secoes)
		.where(eq(secoes.apostilaId, apostilaId))
		.orderBy(asc(secoes.ordem), asc(secoes.id));

	return {
		apostila,
		secoes: listaSecoes,
		aula: { ...aula, blocos: normalizarBlocos(aula.blocos as Blocos) },
		novo: event.url.searchParams.get('novo') === '1'
	};
};

export const actions: Actions = {
	salvar: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);
		const aulaId = Number(event.params.aulaId);
		const dados = await event.request.formData();

		const titulo = String(dados.get('titulo') ?? '').trim();
		if (!titulo) return fail(400, { erro: 'Informe o título da aula.' });

		let blocos: Blocos;
		try {
			blocos = normalizarBlocos(JSON.parse(String(dados.get('blocos') ?? '[]')));
		} catch {
			return fail(400, { erro: 'Os blocos enviados são inválidos.' });
		}

		const nomeSecao = normalizarNomeSecao(dados.get('secaoNome'));
		const secaoIdBruto = String(dados.get('secaoId') ?? '').trim();
		let secaoId: number | null = null;

		if (nomeSecao) {
			const existentes = await db
				.select()
				.from(secoes)
				.where(eq(secoes.apostilaId, apostilaId));
			const jaExistente = existentes.find((secao) => mesmoNomeSecao(secao.nome, nomeSecao));
			if (jaExistente) {
				secaoId = jaExistente.id;
			} else {
				const [linha] = await db
					.select({ max: max(secoes.ordem) })
					.from(secoes)
					.where(eq(secoes.apostilaId, apostilaId));
				const [criada] = await db
					.insert(secoes)
					.values({ apostilaId, nome: nomeSecao, ordem: (linha?.max ?? -1) + 1 })
					.returning();
				secaoId = criada.id;
			}
		} else if (secaoIdBruto) {
			const [valida] = await db
				.select({ id: secoes.id })
				.from(secoes)
				.where(and(eq(secoes.id, Number(secaoIdBruto)), eq(secoes.apostilaId, apostilaId)))
				.limit(1);
			if (!valida) return fail(400, { erro: 'Seção inválida.' });
			secaoId = valida.id;
		}

		await db
			.update(aulas)
			.set({
				titulo,
				secaoId,
				descricao: String(dados.get('descricao') ?? '').trim(),
				blocos,
				updatedAt: new Date()
			})
			.where(eq(aulas.id, aulaId));

		throw redirect(303, `/apostilas/${apostilaId}/aulas/${aulaId}`);
	}
};
