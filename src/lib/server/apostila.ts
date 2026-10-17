// Regras do painel da apostila: carregar o que a página mostra (apostila, aulas
// e seções), o CRUD de seção e a reordenação de seções/aulas. O SQL que muda de
// corpo entre os dialetos (as transações, síncronas no SQLite) fica todo aqui —
// a rota só chama o serviço e traduz o `Falha` no retorno da action.

import { error } from '@sveltejs/kit';
import { and, asc, eq, max } from 'drizzle-orm';
import { mesmoNomeSecao, normalizarNomeSecao } from '$lib/blocks';
import { db } from '$lib/server/db';
import { apostilas, aulas, secoes } from '$lib/server/db/schema';
import { transacao } from '$lib/server/db/transacao';
import type { Falha } from '$lib/server/conteudo';

// `alvo: 'secao'` diz à página para mostrar o aviso dentro da caixa de seções em
// vez do topo (ver o `form?.alvo` em `+page.svelte`).
export type FalhaPainel = Falha & { alvo?: 'secao' };

export async function carregarPainel(apostilaId: number) {
	const [apostila] = await db.select().from(apostilas).where(eq(apostilas.id, apostilaId)).limit(1);
	if (!apostila) throw error(404, 'Apostila não encontrada');

	const listaAulas = await db
		.select()
		.from(aulas)
		.where(eq(aulas.apostilaId, apostilaId))
		.orderBy(asc(aulas.ordem), asc(aulas.id));

	const listaSecoes = await db
		.select()
		.from(secoes)
		.where(eq(secoes.apostilaId, apostilaId))
		.orderBy(asc(secoes.ordem), asc(secoes.id));

	return { apostila, aulas: listaAulas, secoes: listaSecoes };
}

export async function renomearApostila(
	apostilaId: number,
	dados: FormData
): Promise<FalhaPainel | null> {
	const titulo = String(dados.get('titulo') ?? '').trim();
	if (!titulo) return { erro: 'Informe um título.', status: 400 };

	await db
		.update(apostilas)
		.set({
			titulo,
			descricao: String(dados.get('descricao') ?? '').trim(),
			updatedAt: new Date()
		})
		.where(eq(apostilas.id, apostilaId));

	return null;
}

async function secaoDaApostila(apostilaId: number, secaoId: number) {
	const [secao] = await db.select().from(secoes).where(eq(secoes.id, secaoId)).limit(1);
	return secao?.apostilaId === apostilaId ? secao : null;
}

async function nomeEmUso(apostilaId: number, nome: string, ignorarId?: number) {
	const lista = await db.select().from(secoes).where(eq(secoes.apostilaId, apostilaId));
	return lista.some((secao) => secao.id !== ignorarId && mesmoNomeSecao(secao.nome, nome));
}

export async function criarSecao(
	apostilaId: number,
	dados: FormData
): Promise<FalhaPainel | null> {
	const nome = normalizarNomeSecao(dados.get('nome'));
	if (!nome) return { erro: 'Informe o nome da seção.', status: 400, alvo: 'secao' };
	if (await nomeEmUso(apostilaId, nome))
		return { erro: `Já existe uma seção chamada "${nome}".`, status: 409, alvo: 'secao' };

	const [linha] = await db
		.select({ max: max(secoes.ordem) })
		.from(secoes)
		.where(eq(secoes.apostilaId, apostilaId));

	await db.insert(secoes).values({ apostilaId, nome, ordem: (linha?.max ?? -1) + 1 });
	return null;
}

export async function renomearSecao(
	apostilaId: number,
	dados: FormData
): Promise<FalhaPainel | null> {
	const secaoId = Number(dados.get('secaoId') ?? '');
	const nome = normalizarNomeSecao(dados.get('nome'));
	if (!(await secaoDaApostila(apostilaId, secaoId)))
		return { erro: 'Seção não encontrada.', status: 404, alvo: 'secao' };
	if (!nome) return { erro: 'Informe o nome da seção.', status: 400, alvo: 'secao' };
	if (await nomeEmUso(apostilaId, nome, secaoId))
		return { erro: `Já existe uma seção chamada "${nome}".`, status: 409, alvo: 'secao' };

	await db.update(secoes).set({ nome }).where(eq(secoes.id, secaoId));
	return null;
}

export async function excluirSecao(
	apostilaId: number,
	dados: FormData
): Promise<FalhaPainel | null> {
	const secaoId = Number(dados.get('secaoId') ?? '');
	if (!(await secaoDaApostila(apostilaId, secaoId)))
		return { erro: 'Seção não encontrada.', status: 404, alvo: 'secao' };

	// SQLite não liga `PRAGMA foreign_keys` (ver `node-sqlite.ts`): solta as aulas
	// da seção na mão em vez de contar com o cascade.
	await transacao((tx) => {
		tx.update(aulas).set({ secaoId: null }).where(eq(aulas.secaoId, secaoId)).run();
		tx.delete(secoes).where(eq(secoes.id, secaoId)).run();
	});

	return null;
}

// `lerIds`/`lerOrdens` leem o payload do drag and drop: a lista inteira na ordem
// nova, validada antes de gravar (a lista filtrada pela busca nunca chega aqui).
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
			const secaoId = item.secaoId === null || item.secaoId === '' ? null : Number(item.secaoId);
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

export async function reordenarSecoes(
	apostilaId: number,
	dados: FormData
): Promise<FalhaPainel | null> {
	const ids = lerIds(dados);
	if (!ids) return { erro: 'Ordem inválida.', status: 400 };

	const existentes = await db
		.select({ id: secoes.id })
		.from(secoes)
		.where(eq(secoes.apostilaId, apostilaId));
	const validas = new Set(existentes.map((secao) => secao.id));
	if (ids.length !== existentes.length || ids.some((id) => !validas.has(id)))
		return { erro: 'Ordem inválida.', status: 400 };

	await transacao((tx) => {
		ids.forEach((id, indice) => {
			tx.update(secoes).set({ ordem: indice }).where(eq(secoes.id, id)).run();
		});
	});

	return null;
}

export async function reordenarAulas(
	apostilaId: number,
	dados: FormData
): Promise<FalhaPainel | null> {
	const ordens = lerOrdens(dados);
	if (!ordens) return { erro: 'Ordem inválida.', status: 400 };

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
		return { erro: 'Ordem inválida.', status: 400 };

	await transacao((tx) => {
		ordens.forEach((ordem, indice) => {
			tx.update(aulas)
				.set({ ordem: indice, secaoId: ordem.secaoId })
				.where(eq(aulas.id, ordem.id))
				.run();
		});
	});

	return null;
}

export async function criarAula(apostilaId: number): Promise<number> {
	const [linha] = await db
		.select({ max: max(aulas.ordem) })
		.from(aulas)
		.where(eq(aulas.apostilaId, apostilaId));

	const [nova] = await db
		.insert(aulas)
		.values({ apostilaId, titulo: 'Nova aula', ordem: (linha?.max ?? 0) + 1 })
		.returning();

	return nova.id;
}

export async function excluirAula(
	apostilaId: number,
	dados: FormData
): Promise<FalhaPainel | null> {
	const aulaId = Number(dados.get('aulaId') ?? '');
	const [alvo] = await db
		.select({ apostilaId: aulas.apostilaId })
		.from(aulas)
		.where(and(eq(aulas.id, aulaId), eq(aulas.apostilaId, apostilaId)))
		.limit(1);
	if (!alvo) return { erro: 'Aula não encontrada.', status: 404 };

	await db.delete(aulas).where(eq(aulas.id, aulaId));
	return null;
}

export async function excluirApostila(apostilaId: number): Promise<void> {
	// Ordem importa: aula e seção primeiro, apostila por último (nada de cascade
	// no SQLite; ver `excluirSecao`).
	await transacao((tx) => {
		tx.delete(aulas).where(eq(aulas.apostilaId, apostilaId)).run();
		tx.delete(secoes).where(eq(secoes.apostilaId, apostilaId)).run();
		tx.delete(apostilas).where(eq(apostilas.id, apostilaId)).run();
	});
}
