// Regras compartilhadas entre aula e anexo: os dois guardam blocos e são
// validados no POST do mesmo jeito (título, blocos e alvo dos links internos).

import { error } from '@sveltejs/kit';
import { inArray } from 'drizzle-orm';
import { normalizarBlocos, type Bloco, type BlocoLink, type Blocos } from '$lib/blocks';
import { ROTULO_TIPO, type TipoConteudo } from '$lib/conteudo';
import { db } from '$lib/server/db';
import { anexos, aulas, exercicios } from '$lib/server/db/schema';

export type Falha = { erro: string; status: number };

export function erroNaoEncontrado(tipo: TipoConteudo) {
	return error(404, `${ROTULO_TIPO[tipo]} não encontrada`);
}

export function lerConteudo(dados: FormData, tipo: TipoConteudo):
	| { titulo: string; descricao: string; blocos: Blocos }
	| Falha {
	const titulo = String(dados.get('titulo') ?? '').trim();
	if (!titulo) return { erro: `Informe o título do ${ROTULO_TIPO[tipo].toLowerCase()}.`, status: 400 };

	let blocos: Blocos;
	try {
		blocos = normalizarBlocos(JSON.parse(String(dados.get('blocos') ?? '[]')));
	} catch {
		return { erro: 'Os blocos enviados são inválidos.', status: 400 };
	}

	return { titulo, descricao: String(dados.get('descricao') ?? '').trim(), blocos };
}

function linkInterno(bloco: Bloco): bloco is BlocoLink & { alvoId: number } {
	return (
		bloco.tipo === 'link' &&
		(bloco.tipoLink === 'aula' || bloco.tipoLink === 'anexo' || bloco.tipoLink === 'exercicio') &&
		typeof bloco.alvoId === 'number'
	);
}

// Link interno precisa apontar para um conteúdo que exista e seja do tipo
// esperado; senão o aluno cairia num 404 depois de salvar.
const DESCRICAO_ALVO: Record<BlocoLink['tipoLink'], { artigo: string; nome: string }> = {
	aula: { artigo: 'A', nome: 'aula' },
	anexo: { artigo: 'O', nome: 'anexo' },
	exercicio: { artigo: 'A', nome: 'atividade' },
	externo: { artigo: 'O', nome: 'link externo' }
};

export async function validarLinksInternos(
	blocos: Blocos,
	contexto: { apostilaId?: number }
): Promise<Falha | null> {
	const alvos = blocos.filter(linkInterno);
	if (alvos.length === 0) return null;

	const ids = [...new Set(alvos.map((bloco) => bloco.alvoId))];
	const [listaAulas, listaAnexos, listaExercicios] = await Promise.all([
		db
			.select({ id: aulas.id, apostilaId: aulas.apostilaId })
			.from(aulas)
			.where(inArray(aulas.id, ids)),
		db.select({ id: anexos.id }).from(anexos).where(inArray(anexos.id, ids)),
		db.select({ id: exercicios.id }).from(exercicios).where(inArray(exercicios.id, ids))
	]);
	const aulaPorId = new Map(listaAulas.map((linha) => [linha.id, linha]));
	const anexoPorId = new Set(listaAnexos.map((linha) => linha.id));
	const exercicioPorId = new Set(listaExercicios.map((linha) => linha.id));

	// A aula é o único alvo preso a uma apostila; anexo e atividade são soltos.
	const existe = (bloco: BlocoLink & { alvoId: number }) =>
		bloco.tipoLink === 'aula'
			? aulaPorId.get(bloco.alvoId)?.apostilaId === contexto.apostilaId
			: bloco.tipoLink === 'anexo'
				? anexoPorId.has(bloco.alvoId)
				: exercicioPorId.has(bloco.alvoId);

	for (const bloco of alvos) {
		if (existe(bloco)) continue;
		const { artigo, nome } = DESCRICAO_ALVO[bloco.tipoLink];
		return {
			erro: `${artigo} ${nome} escolhida para o link "${bloco.rotulo}" não existe mais. Escolha outro alvo ou remova o link.`,
			status: 400
		};
	}

	return null;
}
