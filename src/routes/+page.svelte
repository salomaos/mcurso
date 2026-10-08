<script lang="ts">
	import type { PageData } from './$types';
	import type { ApostilaComTotal } from './+page.server';
	import CardConteudo from '$lib/components/ui/CardConteudo.svelte';
	import CabecalhoPagina from '$lib/components/ui/CabecalhoPagina.svelte';
	import DataBadge from '$lib/components/ui/DataBadge.svelte';
	import Pagina from '$lib/components/ui/Pagina.svelte';
	import SeletorVisao from '$lib/components/ui/SeletorVisao.svelte';
	import { classeLista, getVisao } from '$lib/visao.svelte';

	let { data } = $props<{ data: PageData }>();
	let busca = $state('');

	const total = $derived(data.apostilas.length);
	let visao = $derived(getVisao());

	const visiveis = $derived(
		data.apostilas.filter(
			(apostila: ApostilaComTotal) =>
				!busca.trim() || apostila.titulo.toLowerCase().includes(busca.trim().toLowerCase())
		)
	);

	function aoDigitar(event: Event) {
		busca = (event.currentTarget as HTMLInputElement).value;
	}
</script>

<svelte:head>
	<title>Apostilas — mcurso</title>
</svelte:head>

<Pagina largura="amplo" espaco={4}>
	<CabecalhoPagina titulo="Apostilas" subtitulo="Material de aula para leitura e impressão.">
		{#if data.user}
			<a href="/apostilas/nova" class="btn btn-primary">+ Nova apostila</a>
		{/if}
	</CabecalhoPagina>

	{#if total === 0}
		<div class="alert alert-info">
			{#if data.user}
				Nenhuma apostila ainda. Comece criando a primeira.
			{:else}
				Nenhuma apostila publicada ainda.
			{/if}
		</div>
	{:else}
		<div class="flex flex-wrap items-center justify-between gap-2">
			<span class="text-sm opacity-70">
				{visiveis.length}
				{visiveis.length === 1 ? 'apostila' : 'apostilas'}
			</span>
			<div class="flex flex-wrap items-center gap-2">
				<input
					class="input input-sm input-bordered w-64"
					type="search"
					placeholder="Buscar por título..."
					aria-label="Buscar apostila por título"
					value={busca}
					oninput={aoDigitar}
				/>
				<SeletorVisao />
			</div>
		</div>

		{#if visiveis.length === 0}
			<div class="alert alert-info">Nada encontrado para "{busca}".</div>
		{:else}
			<div class={classeLista(visao)}>
				{#each visiveis as apostila (apostila.id)}
					<CardConteudo
						titulo={apostila.titulo}
						href={`/apostilas/${apostila.id}`}
						descricao={apostila.descricao}
						modo={visao}
					>
						{#snippet meta()}
							<DataBadge valor={apostila.createdAt} />
						{/snippet}

						{#snippet marcadores()}
							<span class="badge badge-ghost">
								{apostila.totalAulas}
								{apostila.totalAulas === 1 ? 'aula' : 'aulas'}
							</span>
						{/snippet}
					</CardConteudo>
				{/each}
			</div>
		{/if}
	{/if}
</Pagina>
