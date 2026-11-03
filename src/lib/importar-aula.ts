// Importação/exportação de UMA aula no editor: colar um JSON de aula substitui
// o título, a descrição e todos os blocos da aula aberta (o professor confirma
// antes e grava com o "Salvar" normal). A resolução de links é client-side e
// contra os alvos reais do editor (aulas da apostila, anexos e atividades); o
// save do servidor revalida tudo de qualquer forma.

import {
	ehLarguraLink,
	ehPosicaoLink,
	ehTamanhoLink,
	mesmoNomeSecao,
	normalizarBlocos,
	novoId,
	type Blocos
} from '$lib/blocks';
import type { AlvoLink } from '$lib/conteudo';
import { blocosParaExportar, type TitulosPorTipo } from '$lib/exportar-blocos';
import type { ImportacaoAulaEnvelope, ImportacaoBloco } from '$lib/importar';

export type AlvosLinksAula = { aulas: AlvoLink[]; anexos: AlvoLink[]; exercicios: AlvoLink[] };

export type ResultadoResolucaoAula = { blocos: Blocos } | { erro: string };

type ErroOu<T> = { ok: T } | { erro: string };

// Ids de bloco são chave do editor/estado e o JSON colado dificilmente tem os
// mesmos (ou únicos). Regenera os que faltam ou repetem — o JSON não precisa
// de `id` nenhum (mesma regra do import server-side).
function garantirIds(blocos: ImportacaoBloco[]): ImportacaoBloco[] {
	const usados = new Set<string>();
	return blocos.map((bloco) => {
		const id = bloco.id;
		const valido = typeof id === 'string' && id !== '' && !usados.has(id);
		const idFinal = valido ? id : novoId();
		usados.add(idFinal);
		return valido ? bloco : { ...bloco, id: idFinal };
	});
}

function blocoLink(
	bloco: ImportacaoBloco,
	alvo: { alvoId: number } | { url: string }
): ImportacaoBloco {
	const saida: ImportacaoBloco = {
		id: bloco.id,
		tipo: 'link',
		rotulo: typeof bloco.rotulo === 'string' ? bloco.rotulo : '',
		tipoLink: bloco.tipoLink,
		...('alvoId' in alvo ? { alvoId: alvo.alvoId } : { url: alvo.url })
	};
	// Cosméticos do link: viajam junto para o round-trip não perder o tamanho.
	if (ehTamanhoLink(bloco.tamanho)) saida.tamanho = bloco.tamanho;
	if (ehLarguraLink(bloco.largura)) saida.largura = bloco.largura;
	if (ehPosicaoLink(bloco.posicao)) saida.posicao = bloco.posicao;
	return saida;
}

function rotuloDoLink(bloco: ImportacaoBloco): string {
	return typeof bloco.rotulo === 'string' ? bloco.rotulo : '';
}

function alvoPorTitulo(alvos: AlvoLink[], titulo: string): number | undefined {
	return alvos.find((alvo) => mesmoNomeSecao(alvo.titulo, titulo))?.id;
}

// Aula é o alvo preso à apostila da aula aberta: `alvoTitulo` resolve por
// título na lista de aulas do editor (sem acento/caixa), `alvoId` valida um id
// existente e `alvoOrdem` não tem onde cair (não há "lista de import" — o
// JSON é a aula inteira).
function alvoAula(bloco: ImportacaoBloco, aulas: AlvoLink[]): ErroOu<number> {
	const rotulo = rotuloDoLink(bloco);
	if (Number.isInteger(bloco.alvoOrdem)) {
		return {
			erro: `O link "${rotulo}" usa "alvoOrdem": na importação de aula use "alvoTitulo" (título de uma aula desta apostila) ou "alvoId".`
		};
	}
	const titulo = typeof bloco.alvoTitulo === 'string' ? bloco.alvoTitulo.trim() : '';
	if (titulo) {
		const id = alvoPorTitulo(aulas, titulo);
		if (id === undefined) {
			return {
				erro: `Não achei a aula "${titulo}" para o link "${rotulo}": confira o título (o alvo precisa ser uma aula desta apostila).`
			};
		}
		return { ok: id };
	}
	if (Number.isInteger(bloco.alvoId) && Number(bloco.alvoId) > 0) {
		const id = Number(bloco.alvoId);
		if (!aulas.some((aula) => aula.id === id)) {
			return { erro: `A aula ${id} do link "${rotulo}" não existe nesta apostila.` };
		}
		return { ok: id };
	}
	return {
		erro: `O link "${rotulo}" é interno mas não diz o alvo: use "alvoTitulo" (título de uma aula desta apostila) ou "alvoId" (de uma aula existente).`
	};
}

function alvoSolto(
	bloco: ImportacaoBloco,
	tipo: 'anexo' | 'exercicio',
	alvos: AlvosLinksAula
): ErroOu<number> {
	const rotulo = rotuloDoLink(bloco);
	const lista = tipo === 'anexo' ? alvos.anexos : alvos.exercicios;
	const nomeMenor = tipo === 'anexo' ? 'anexo' : 'atividade';
	const nomeMaior = tipo === 'anexo' ? 'um anexo' : 'uma atividade';

	if (Number.isInteger(bloco.alvoId) && Number(bloco.alvoId) > 0) {
		const id = Number(bloco.alvoId);
		if (!lista.some((alvo) => alvo.id === id)) {
			return { erro: `O ${nomeMenor} ${id} do link "${rotulo}" não existe.` };
		}
		return { ok: id };
	}
	const titulo = typeof bloco.alvoTitulo === 'string' ? bloco.alvoTitulo.trim() : '';
	if (titulo) {
		const id = alvoPorTitulo(lista, titulo);
		if (id === undefined) {
			return {
				erro: `Não achei ${nomeMaior} chamada "${titulo}" para o link "${rotulo}". O conteúdo precisa existir antes (crie ou use "alvoId").`
			};
		}
		return { ok: id };
	}
	return {
		erro: `O link "${rotulo}" está sem alvo: use "alvoId" (id já existente) ou "alvoTitulo" (título de um conteúdo existente).`
	};
}

// Converte os blocos crus do JSON em `Blocos` finais, resolvendo os alvos dos
// links contra o que já existe. Link que não resolve aborta a importação com
// mensagem — mesma postura do import server-side.
export function resolverLinksAula(
	blocos: ImportacaoBloco[],
	alvos: AlvosLinksAula
): ResultadoResolucaoAula {
	const comId = garantirIds(blocos);
	const resolvidos: ImportacaoBloco[] = [];

	for (const bloco of comId) {
		if (bloco.tipo !== 'link') {
			resolvidos.push(bloco);
			continue;
		}
		const tipoLink = String(bloco.tipoLink ?? '');
		if (tipoLink === 'externo') {
			resolvidos.push(blocoLink(bloco, { url: typeof bloco.url === 'string' ? bloco.url : '' }));
			continue;
		}
		if (tipoLink === 'aula') {
			const alvo = alvoAula(bloco, alvos.aulas);
			if ('erro' in alvo) return alvo;
			resolvidos.push(blocoLink(bloco, { alvoId: alvo.ok }));
			continue;
		}
		if (tipoLink === 'anexo' || tipoLink === 'exercicio') {
			const alvo = alvoSolto(bloco, tipoLink, alvos);
			if ('erro' in alvo) return alvo;
			resolvidos.push(blocoLink(bloco, { alvoId: alvo.ok }));
			continue;
		}
		// tipoLink fora da lista: deixa o normalizador descartar (ehBloco).
		resolvidos.push(bloco);
	}

	return { blocos: normalizarBlocos(resolvidos) };
}

// Exporta o estado atual do editor (inclusive o que ainda não foi salvo) no
// formato canônico do importar: link interno sai como `alvoTitulo` e tabela
// simples sai no formato curto. `alvos` monta o mapa id → título.
export function exportarAulaLocal(
	titulo: string,
	descricao: string,
	blocos: Blocos,
	alvos: AlvosLinksAula
): string {
	const titulos: TitulosPorTipo = {
		aulas: new Map(alvos.aulas.map((alvo) => [alvo.id, alvo.titulo])),
		anexos: new Map(alvos.anexos.map((alvo) => [alvo.id, alvo.titulo])),
		exercicios: new Map(alvos.exercicios.map((alvo) => [alvo.id, alvo.titulo]))
	};
	const dados: ImportacaoAulaEnvelope = {
		conteudo: 'aula',
		titulo,
		descricao,
		blocos: blocosParaExportar(blocos, titulos)
	};
	return JSON.stringify(dados, null, 2);
}
