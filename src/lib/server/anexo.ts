// Anexo é material de apoio **solto**: não pertence a apostila nem a aula, é
// criado em /anexos e usado por link dentro das aulas.

import { asc, eq } from 'drizzle-orm';
import { linksPara, normalizarBlocos, type Blocos } from '$lib/blocks';
import type { AnexoUi, AlvoLink, ReferenciaAnexo } from '$lib/conteudo';
import { db } from '$lib/server/db';
import { anexos, aulas } from '$lib/server/db/schema';
import { erroNaoEncontrado, lerConteudo, validarLinksInternos, type Falha } from '$lib/server/conteudo';

export type { AnexoUi, ReferenciaAnexo };

function comBlocos(linha: typeof anexos.$inferSelect) {
	return { ...linha, blocos: normalizarBlocos(linha.blocos as Blocos) };
}

export async function buscarAnexo(anexoId: number) {
	const [linha] = await db.select().from(anexos).where(eq(anexos.id, anexoId)).limit(1);
	if (!linha) throw erroNaoEncontrado('anexo');
	return comBlocos(linha);
}

// Aulas (de qualquer apostila) que apontam para o anexo.
export async function referenciasDoAnexo(anexoId: number): Promise<ReferenciaAnexo[]> {
	const lista = await db
		.select({ id: aulas.id, titulo: aulas.titulo, apostilaId: aulas.apostilaId, blocos: aulas.blocos })
		.from(aulas);

	return lista
		.filter(
			(aula) => linksPara(normalizarBlocos(aula.blocos as Blocos), { tipo: 'anexo', id: anexoId }).length > 0
		)
		.map((aula) => ({ id: aula.id, titulo: aula.titulo, apostilaId: aula.apostilaId }));
}

export async function listarAnexos(): Promise<AnexoUi[]> {
	const [listaAnexos, listaAulas] = await Promise.all([
		db.select().from(anexos).orderBy(asc(anexos.titulo)),
		db
			.select({ id: aulas.id, titulo: aulas.titulo, apostilaId: aulas.apostilaId, blocos: aulas.blocos })
			.from(aulas)
	]);

	// Índice de referências: uma aula pode linkar o mesmo anexo em vários blocos
	// e conta uma vez só.
	const porAnexo = new Map<number, ReferenciaAnexo[]>();
	for (const aula of listaAulas) {
		const blocos = normalizarBlocos(aula.blocos as Blocos);
		const ids = new Set(
			blocos
				.filter((bloco) => bloco.tipo === 'link' && bloco.tipoLink === 'anexo')
				.map((bloco) => (bloco.tipo === 'link' ? bloco.alvoId : null))
				.filter((id): id is number => id !== null && id !== undefined)
		);
		for (const id of ids) {
			const lista = porAnexo.get(id) ?? [];
			lista.push({ id: aula.id, titulo: aula.titulo, apostilaId: aula.apostilaId });
			porAnexo.set(id, lista);
		}
	}

	return listaAnexos.map((linha) => ({
		...linha,
		referencias: porAnexo.get(linha.id) ?? []
	}));
}

export async function alvosAnexos(): Promise<AlvoLink[]> {
	const lista = await db
		.select({ id: anexos.id, titulo: anexos.titulo, descricao: anexos.descricao })
		.from(anexos)
		.orderBy(asc(anexos.titulo));
	return lista.map((anexo) => ({ id: anexo.id, titulo: anexo.titulo, detalhe: anexo.descricao }));
}

export async function criarAnexo() {
	const [anexo] = await db.insert(anexos).values({ titulo: 'Novo anexo' }).returning();
	return anexo;
}

export async function salvarAnexo(anexoId: number, dados: FormData): Promise<Falha | null> {
	const conteudo = lerConteudo(dados, 'anexo');
	if ('erro' in conteudo) return conteudo;

	const falhaLink = await validarLinksInternos(conteudo.blocos, {});
	if (falhaLink) return falhaLink;

	await db
		.update(anexos)
		.set({
			titulo: conteudo.titulo,
			descricao: conteudo.descricao,
			blocos: conteudo.blocos,
			updatedAt: new Date()
		})
		.where(eq(anexos.id, anexoId));

	return null;
}

// Anexo em uso não pode ser excluído: os links das aulas ficariam quebrados.
export async function excluirAnexo(anexoId: number): Promise<Falha | null> {
	const [alvo] = await db.select({ id: anexos.id }).from(anexos).where(eq(anexos.id, anexoId)).limit(1);
	if (!alvo) return { erro: 'Anexo não encontrado.', status: 404 };

	const referencias = await referenciasDoAnexo(anexoId);
	if (referencias.length > 0) {
		const lista = referencias.map((ref) => `"${ref.titulo}"`).join(', ');
		return {
			erro: `Este anexo é usado em ${referencias.length} aula(s): ${lista}. Remova os links antes de excluir.`,
			status: 409
		};
	}

	await db.delete(anexos).where(eq(anexos.id, anexoId));
	return null;
}
