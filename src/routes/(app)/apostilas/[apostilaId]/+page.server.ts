import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, eq, max } from 'drizzle-orm';
import { mesmoNomeSecao, normalizarNomeSecao } from '$lib/blocks';
import { db } from '$lib/server/db';
import { apostilas, aulas, secoes } from '$lib/server/db/schema';
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

	const listaSecoes = await db
		.select()
		.from(secoes)
		.where(eq(secoes.apostilaId, id))
		.orderBy(asc(secoes.ordem), asc(secoes.id));

	return { apostila, aulas: listaAulas, secoes: listaSecoes };
};

async function secaoDaApostila(apostilaId: number, secaoId: number) {
	const [secao] = await db
		.select()
		.from(secoes)
		.where(eq(secoes.id, secaoId))
		.limit(1);
	return secao?.apostilaId === apostilaId ? secao : null;
}

async function nomeEmUso(apostilaId: number, nome: string, ignorarId?: number) {
	const lista = await db
		.select()
		.from(secoes)
		.where(eq(secoes.apostilaId, apostilaId));
	return lista.some((secao) => secao.id !== ignorarId && mesmoNomeSecao(secao.nome, nome));
}

function lerIds(dados: FormData): number[] | null {
	try {
		const bruto = JSON.parse(String(dados.get('dados') ?? 'null')) as { ids?: unknown };
		if (!Array.isArray(bruto?.ids)) return null;
		const ids = bruto.ids.map((valor) => Number(valor));
		const validos = ids.every((id) => Number.isInteger(id) && id > 0);
		return validos && new Set(ids).size === ids.length ? ids : null;
	} catch {
		return null;
	}
}

function lerOrdens(dados: FormData): { id: number; secaoId: number | null }[] | null {
	try {
		const bruto = JSON.parse(String(dados.get('dados') ?? 'null')) as { ordens?: unknown };
		if (!Array.isArray(bruto?.ordens)) return null;
		const ordens = bruto.ordens.map((valor) => {
			const item = (valor ?? {}) as { id?: unknown; secaoId?: unknown };
			const id = Number(item.id);
			const secaoId =
				item.secaoId === null || item.secaoId === '' ? null : Number(item.secaoId);
			return { id, secaoId };
		});
		const validos = ordens.every(
			(ordem) =>
				Number.isInteger(ordem.id) &&
				ordem.id > 0 &&
				(ordem.secaoId === null || (Number.isInteger(ordem.secaoId) && ordem.secaoId > 0))
		);
		return validos ? ordens : null;
	} catch {
		return null;
	}
}

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

	criarSecao: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);
		const dados = await event.request.formData();
		const nome = normalizarNomeSecao(dados.get('nome'));
		if (!nome) return fail(400, { erro: 'Informe o nome da seção.', alvo: 'secao' });
		if (await nomeEmUso(apostilaId, nome))
			return fail(409, { erro: `Já existe uma seção chamada "${nome}".`, alvo: 'secao' });

		const [linha] = await db
			.select({ max: max(secoes.ordem) })
			.from(secoes)
			.where(eq(secoes.apostilaId, apostilaId));

		await db.insert(secoes).values({ apostilaId, nome, ordem: (linha?.max ?? -1) + 1 });
		return { ok: true };
	},

	renomearSecao: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);
		const dados = await event.request.formData();
		const secaoId = Number(dados.get('secaoId') ?? '');
		const nome = normalizarNomeSecao(dados.get('nome'));
		if (!await secaoDaApostila(apostilaId, secaoId))
			return fail(404, { erro: 'Seção não encontrada.', alvo: 'secao' });
		if (!nome) return fail(400, { erro: 'Informe o nome da seção.', alvo: 'secao' });
		if (await nomeEmUso(apostilaId, nome, secaoId))
			return fail(409, { erro: `Já existe uma seção chamada "${nome}".`, alvo: 'secao' });

		await db.update(secoes).set({ nome }).where(eq(secoes.id, secaoId));
		return { ok: true };
	},

	excluirSecao: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);
		const dados = await event.request.formData();
		const secaoId = Number(dados.get('secaoId') ?? '');
		if (!await secaoDaApostila(apostilaId, secaoId))
			return fail(404, { erro: 'Seção não encontrada.', alvo: 'secao' });

		await db.transaction((tx) => {
			tx.update(aulas).set({ secaoId: null }).where(eq(aulas.secaoId, secaoId)).run();
			tx.delete(secoes).where(eq(secoes.id, secaoId)).run();
		});
		return { ok: true };
	},

	reordenarSecoes: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);
		const ids = lerIds(await event.request.formData());
		if (!ids) return fail(400, { erro: 'Ordem inválida.' });

		const existentes = await db
			.select({ id: secoes.id })
			.from(secoes)
			.where(eq(secoes.apostilaId, apostilaId));
		const validas = new Set(existentes.map((secao) => secao.id));
		if (ids.length !== existentes.length || ids.some((id) => !validas.has(id)))
			return fail(400, { erro: 'Ordem inválida.' });

		db.transaction((tx) => {
			ids.forEach((id, indice) => {
				tx.update(secoes).set({ ordem: indice }).where(eq(secoes.id, id)).run();
			});
		});

		return { ok: true };
	},

	reordenarAulas: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);
		const ordens = lerOrdens(await event.request.formData());
		if (!ordens) return fail(400, { erro: 'Ordem inválida.' });

		const [existentes, listaSecoes] = await Promise.all([
			db.select({ id: aulas.id }).from(aulas).where(eq(aulas.apostilaId, apostilaId)),
			db.select({ id: secoes.id }).from(secoes).where(eq(secoes.apostilaId, apostilaId))
		]);
		const validas = new Set(existentes.map((aula) => aula.id));
		const secoesValidas = new Set(listaSecoes.map((secao) => secao.id));
		if (
			ordens.length !== existentes.length ||
			new Set(ordens.map((ordem) => ordem.id)).size !== ordens.length ||
			ordens.some(
				(ordem) =>
					!validas.has(ordem.id) || (ordem.secaoId !== null && !secoesValidas.has(ordem.secaoId))
			)
		)
			return fail(400, { erro: 'Ordem inválida.' });

		db.transaction((tx) => {
			ordens.forEach((ordem, indice) => {
				tx.update(aulas)
					.set({ ordem: indice, secaoId: ordem.secaoId })
					.where(eq(aulas.id, ordem.id))
					.run();
			});
		});

		return { ok: true };
	},

	criarAula: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);

		const [linha] = await db
			.select({ max: max(aulas.ordem) })
			.from(aulas)
			.where(eq(aulas.apostilaId, apostilaId));

		const [nova] = await db
			.insert(aulas)
			.values({ apostilaId, titulo: 'Nova aula', ordem: (linha?.max ?? 0) + 1 })
			.returning();

		throw redirect(303, `/apostilas/${apostilaId}/aulas/${nova.id}/editar?novo=1`);
	},

	excluirAula: async (event) => {
		requerSessao(event);
		const apostilaId = Number(event.params.apostilaId);
		const dados = await event.request.formData();
		const aulaId = Number(dados.get('aulaId') ?? '');
		const [alvo] = await db
			.select({ apostilaId: aulas.apostilaId })
			.from(aulas)
			.where(and(eq(aulas.id, aulaId), eq(aulas.apostilaId, apostilaId)))
			.limit(1);
		if (!alvo) return fail(404, { erro: 'Aula não encontrada.' });
		await db.delete(aulas).where(eq(aulas.id, aulaId));
		return { ok: true };
	},

	excluir: async (event) => {
		requerSessao(event);
		const id = Number(event.params.apostilaId);
		await db.transaction((tx) => {
			tx.delete(aulas).where(eq(aulas.apostilaId, id)).run();
			tx.delete(secoes).where(eq(secoes.apostilaId, id)).run();
			tx.delete(apostilas).where(eq(apostilas.id, id)).run();
		});
		throw redirect(303, '/apostilas');
	}
};
