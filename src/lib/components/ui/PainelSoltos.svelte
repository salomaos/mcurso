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
	import Pagina from './Pagina.svelte';

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
		busca: string;
		aoBuscar: (valor: string) => void;
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
		busca,
		aoBuscar,
		itens,
		marcadores,
		acoes
	}: Props = $props();

	const total = $derived(itens.length);

	function confirmar(item: T) {
		return (event: SubmitEvent) => {
			if (!confirm(`Excluir ${singular} "${item.titulo}"?`)) event.preventDefault();
		};
	}

	function aoDigitar(event: Event) {
		aoBuscar((event.currentTarget as HTMLInputElement).value);
	}
</script>

<Pagina largura="amplo" espaco={4}>
	<div class="flex flex-wrap items-start justify-between gap-2">
		<div class="space-y-1">
			<h1 class="text-3xl font-bold">{titulo}</h1>
			<p class="text-sm opacity-70">{descricao}</p>
		</div>
		<form method="POST" action="?/criar">
			<button class="btn btn-primary" type="submit">{rotuloCriar}</button>
		</form>
	</div>

	{#if erro}
		<div class="alert alert-error">{erro}</div>
	{/if}

	{#if total === 0}
		<div class="alert alert-info">{rotuloVazio}</div>
	{:else}
		<div class="flex flex-wrap items-center justify-between gap-2">
			<span class="text-sm opacity-70">
				{total} {total === 1 ? singular : plural}
			</span>
			<input
				class="input input-sm input-bordered w-64"
				type="search"
				placeholder="Buscar por título..."
				aria-label={rotuloBusca}
				value={busca}
				oninput={aoDigitar}
			/>
		</div>
	{/if}

	{#if total > 0 && itens.length === 0}
		<div class="alert alert-info">Nada encontrado para "{busca}".</div>
	{/if}

	<ul class="space-y-2">
		{#each itens as item (item.id)}
			<li class="card card-bordered p-4 space-y-2">
				<div class="flex flex-wrap items-start justify-between gap-2">
					<div class="space-y-1 min-w-0">
						<a href={item.href} class="card-title link">{item.titulo}</a>
						{#if item.descricao}
							<p class="text-sm opacity-80">{item.descricao}</p>
						{/if}
					</div>
					<span class="badge badge-ghost text-xs shrink-0">
						{new Date(item.updatedAt).toLocaleDateString('pt-BR')}
					</span>
				</div>

				{#if marcadores}
					<div class="flex flex-wrap items-center gap-2">
						{@render marcadores(item)}
					</div>
				{/if}

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

				<div class="flex flex-wrap items-center gap-1">
					{@render acoes(item)}
					<form method="POST" action="?/excluir" class="ml-auto" onsubmit={confirmar(item)}>
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
				</div>
			</li>
		{/each}
	</ul>
</Pagina>