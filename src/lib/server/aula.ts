// Regras de aula: aula vive dentro de uma apostila, tem seção e entra na
// listagem. Para conteúdo solto (anexo), ver `src/lib/server/anexo.ts`.

import { error } from '@sveltejs/kit';
import { and, asc, eq, max } from 'drizzle-orm';
import { normalizarBlocos, normalizarNomeSecao, mesmoNomeSecao, type Blocos } from '$lib/blocks';
import type { AlvoLink } from '$lib/conteudo';
import { db } from '$lib/server/db';
import { inserirId } from '$lib/server/db/inserir';
import { apostilas, anexos, aulas, secoes } from '$lib/server/db/tabelas';
import {
	erroNaoEncontrado,
	lerConteudo,
	validarLinksInternos,
	type Falha
} from '$lib/server/conteudo';
import { alvosExercicios } from '$lib/server/exercicio';

export type AulaUi = {
	id: number;
	apostilaId: number;
	secaoId: number | null;
	titulo: string;
	descricao: string | null;
	ordem: number;
	blocos: Blocos;
	secao: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export async function buscarAulaPublica(apostilaId: number, aulaId: number) {
	const [linha] = await db.select().from(aulas).where(eq(aulas.id, aulaId)).limit(1);
	if (!linha || linha.apostilaId !== apostilaId) throw erroNaoEncontrado('aula');

	const [apostila] = await db
		.select()
		.from(apostilas)
		.where(eq(apostilas.id, apostilaId))
		.limit(1);
	if (!apostila) throw error(404, 'Apostila não encontrada');

	const [secao] = linha.secaoId
		? await db.select().from(secoes).where(eq(secoes.id, linha.secaoId)).limit(1)
		: [undefined];

	return {
		apostila,
		aula: { ...linha, secao: secao?.nome ?? null, blocos: normalizarBlocos(linha.blocos as Blocos) }
	};
}

export async function carregarParaEditar(apostilaId: number, aulaId: number) {
	const { apostila, aula } = await buscarAulaPublica(apostilaId, aulaId);
	const listaSecoes = await db
		.select()
		.from(secoes)
		.where(eq(secoes.apostilaId, apostilaId))
		.orderBy(asc(secoes.ordem), asc(secoes.id));
	return { apostila, secoes: listaSecoes, aula, alvos: await alvosParaLinks(apostilaId) };
}

// Alvos do bloco de link em uma aula: outras aulas da apostila, anexos soltos e
// atividades soltas (a atividade é a porta de entrada da prova).
export async function alvosParaLinks(apostilaId: number) {
	const [listaAulas, listaAnexos, listaExercicios] = await Promise.all([
		db
			.select({ id: aulas.id, titulo: aulas.titulo })
			.from(aulas)
			.where(eq(aulas.apostilaId, apostilaId))
			.orderBy(asc(aulas.ordem), asc(aulas.id)),
		db
			.select({ id: anexos.id, titulo: anexos.titulo, descricao: anexos.descricao })
			.from(anexos)
			.orderBy(asc(anexos.titulo)),
		alvosExercicios()
	]);

	return {
		aulas: listaAulas satisfies AlvoLink[],
		anexos: listaAnexos.map((anexo) => ({
			id: anexo.id,
			titulo: anexo.titulo,
			detalhe: anexo.descricao
		})) satisfies AlvoLink[],
		exercicios: listaExercicios
	};
}

async function resolverSecao(
	apostilaId: number,
	dados: FormData
): Promise<{ secaoId: number | null } | Falha> {
	const nomeSecao = normalizarNomeSecao(dados.get('secaoNome'));
	const secaoIdBruto = String(dados.get('secaoId') ?? '').trim();

	if (nomeSecao) {
		const existentes = await db
			.select()
			.from(secoes)
			.where(eq(secoes.apostilaId, apostilaId));
		const jaExistente = existentes.find((secao) => mesmoNomeSecao(secao.nome, nomeSecao));
		if (jaExistente) return { secaoId: jaExistente.id };

		const [linha] = await db
			.select({ max: max(secoes.ordem) })
			.from(secoes)
			.where(eq(secoes.apostilaId, apostilaId));
		const secaoId = await inserirId(
			db
				.insert(secoes)
				.values({ apostilaId, nome: nomeSecao, ordem: (linha?.max ?? -1) + 1 })
		);
		return { secaoId };
	}

	if (!secaoIdBruto) return { secaoId: null };

	const [valida] = await db
		.select({ id: secoes.id })
		.from(secoes)
		.where(and(eq(secoes.id, Number(secaoIdBruto)), eq(secoes.apostilaId, apostilaId)))
		.limit(1);
	if (!valida) return { erro: 'Seção inválida.', status: 400 };
	return { secaoId: valida.id };
}

export async function salvarAula(
	apostilaId: number,
	aulaId: number,
	dados: FormData
): Promise<Falha | null> {
	const conteudo = lerConteudo(dados, 'aula');
	if ('erro' in conteudo) return conteudo;

	const falhaLink = await validarLinksInternos(conteudo.blocos, { apostilaId });
	if (falhaLink) return falhaLink;

	const secao = await resolverSecao(apostilaId, dados);
	if ('erro' in secao) return secao;

	await db
		.update(aulas)
		.set({
			titulo: conteudo.titulo,
			descricao: conteudo.descricao,
			blocos: conteudo.blocos,
			secaoId: secao.secaoId,
			updatedAt: new Date()
		})
		.where(and(eq(aulas.id, aulaId), eq(aulas.apostilaId, apostilaId)));

	return null;
}
