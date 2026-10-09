<script lang="ts" module>
	import type { ReferenciaAnexo } from '$lib/conteudo';

	/** O mínimo que o painel precisa de cada item, seja anexo ou atividade. */
	export type ItemSoltos = {
		id: number;
		titulo: string;
		descricao: string | null;
		href: string;
		updatedAt: Date | string;
		referencias: ReferenciaAnexo[];
	};
</script>

<script lang="ts" generics="T extends ItemSoltos">
	import type { Snippet } from 'svelte';
	import CabecalhoPagina from './CabecalhoPagina.svelte';
	import CardConteudo from './CardConteudo.svelte';
	import DataBadge from './DataBadge.svelte';
	import Pagina from './Pagina.svelte';
	import SeletorVisao from './SeletorVisao.svelte';
	import { enviando } from '$lib/enviando';
	import { classeLista, getVisao } from '$lib/visao.svelte';

	type Props = {
		/** Título da página, rótulo no singular e no plural do contador. */
		titulo: string;
		singular: string;
		plural: string;
		descricao: string;
		rotuloCriar: string;
		rotuloBusca: string;
		rotuloVazio: string;
		/** Nome do hidden do form de exclusão (`anexoId`, `exercicioId`). */
		nomeId: string;
		/** Como chamar o item na confirmação e nos títulos dos botões. */
		rotuloTipoExcluir: string;
		tituloSemUso: string;
		tituloEmUso: string;
		erro?: string | null;
		itens: T[];
		/** Badges de contagem/aviso do card. Sai antes das referências. */
		marcadores?: Snippet<[T]>;
		/** Botões de ação do card, antes do Excluir. */
		acoes: Snippet<[T]>;
	};

	let {
		titulo,
		singular,
		plural,
		descricao,
		rotuloCriar,
		rotuloBusca,
		rotuloVazio,
		nomeId,
		rotuloTipoExcluir,
		tituloSemUso,
		tituloEmUso,
		erro = null,
		itens,
		marcadores,
		acoes
	}: Props = $props();

	const total = $derived(itens.length);
	let busca = $state('');
	// `total` é o tamanho real da lista; `visiveis` é o que sobra da busca. Os
	// dois são necessários: com só o filtrado, "Nada encontrado" nunca dispara
	// e a lista vazia mostra a mensagem de "crie o primeiro".
	const visiveis = $derived(
		itens.filter(
			(item) => !busca.trim() || item.titulo.toLowerCase().includes(busca.trim().toLowerCase())
		)
	);
	// O snippet do card se chama como a prop, então o conteúdo vem por um apelido:
	// {@render acoes()} dentro de {#snippet acoes()} seria auto-referência.
	const acoesItem = $derived(acoes);
	const marcadoresItem = $derived(marcadores);
	let visao = $derived(getVisao());

	function confirmar(item: T) {
		return confirm(`Excluir ${singular} "${item.titulo}"?`);
	}

	function aoDigitar(event: Event) {
		busca = (event.currentTarget as HTMLInputElement).value;
	}
</script>

<Pagina largura="amplo" espaco={4}>
	<CabecalhoPagina {titulo} subtitulo={descricao}>
		<form method="POST" action="?/criar" use:enviando>
			<button class="btn btn-primary" type="submit">{rotuloCriar}</button>
		</form>
	</CabecalhoPagina>

	{#if erro}
		<div class="alert alert-error">{erro}</div>
	{/if}

	{#if total === 0}
		<div class="alert alert-info">{rotuloVazio}</div>
	{:else}
		<div class="flex flex-wrap items-center justify-between gap-2">
			<span class="text-sm opacity-70">
				{visiveis.length} {visiveis.length === 1 ? singular : plural}
			</span>
			<div class="flex flex-wrap items-center gap-2">
				<input
					class="input input-sm input-bordered w-64"
					type="search"
					placeholder="Buscar por título..."
					aria-label={rotuloBusca}
					value={busca}
					oninput={aoDigitar}
				/>
				<SeletorVisao />
			</div>
		</div>
	{/if}

	{#if total > 0 && visiveis.length === 0}
		<div class="alert alert-info">Nada encontrado para "{busca}".</div>
	{/if}

	<ul class={classeLista(visao)}>
		{#each visiveis as item (item.id)}
			<CardConteudo
				titulo={item.titulo}
				href={item.href}
				descricao={item.descricao}
				modo={visao}
			>
				{#snippet meta()}
					<DataBadge valor={item.updatedAt} />
				{/snippet}

				{#snippet marcadores()}
					{#if marcadoresItem}
						{@render marcadoresItem(item)}
					{/if}
				{/snippet}

				{#snippet detalhe()}
					<div class="flex flex-wrap items-center gap-2">
						{#if item.referencias.length === 0}
							<span class="badge badge-warning gap-1" title={tituloSemUso}>Sem uso</span>
						{:else}
							<span class="badge badge-ghost">
								Usado em {item.referencias.length}
								{item.referencias.length === 1 ? 'aula' : 'aulas'}
							</span>
							<ul class="flex flex-wrap items-center gap-1">
								{#each item.referencias as referencia (referencia.id)}
									<li>
										<a
											href={`/apostilas/${referencia.apostilaId}/aulas/${referencia.id}`}
											class="link text-xs opacity-70"
										>
											{referencia.titulo}
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/snippet}

				{#snippet acoes()}
					{@render acoesItem(item)}
					<form
						method="POST"
						action="?/excluir"
						class="ml-auto"
						use:enviando={{ confirmar: () => confirmar(item) }}
					>
						<input type="hidden" name={nomeId} value={item.id} />
						<button
							class="btn btn-ghost btn-sm"
							type="submit"
							disabled={item.referencias.length > 0}
							title={item.referencias.length > 0 ? tituloEmUso : `Excluir ${rotuloTipoExcluir}`}
						>
							Excluir
						</button>
					</form>
				{/snippet}
			</CardConteudo>
		{/each}
	</ul>
</Pagina>