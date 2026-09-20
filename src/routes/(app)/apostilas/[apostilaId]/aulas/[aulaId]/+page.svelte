<script lang="ts">
	import BlocoRender from '$lib/components/BlocoRender.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
	<title>{data.aula.titulo} — mcurso</title>
</svelte:head>

<div class="container max-w-3xl px-4 py-6 space-y-5">
	<div class="flex items-center justify-between gap-2 no-print">
		<a href={`/apostilas/${data.apostila.id}`} class="btn btn-ghost btn-sm">← {data.apostila.titulo}</a>
		<div class="flex gap-1">
			{#if data.user}
				<a
					href={`/apostilas/${data.apostila.id}/aulas/${data.aula.id}/editar`}
					class="btn btn-outline btn-sm"
				>
					Editar
				</a>
			{/if}
			<a
				href={`/apostilas/${data.apostila.id}/aulas/${data.aula.id}/imprimir`}
				class="btn btn-ghost btn-sm"
				target="_blank"
			>
				Imprimir/PDF
			</a>
			<a
				href={`/apostilas/${data.apostila.id}/aulas/${data.aula.id}/apresentar`}
				class="btn btn-sm"
				title="Modo apresentação (slides)"
			>
				Apresentar
			</a>
		</div>
	</div>

	<header class="space-y-1">
		{#if data.aula.secao}
			<span class="badge badge-outline">{data.aula.secao}</span>
		{/if}
		<h1 class="text-3xl font-bold">{data.aula.titulo}</h1>
		{#if data.aula.descricao}
			<p class="opacity-80">{data.aula.descricao}</p>
		{/if}
	</header>

	{#if data.aula.blocos.length === 0}
		<div class="alert alert-info">
			{#if data.user}
				Aula sem blocos ainda.
				<a
					href={`/apostilas/${data.apostila.id}/aulas/${data.aula.id}/editar`}
					class="link"
				>
					Editar conteúdo
				</a>
				.
			{:else}
				Aula sem conteúdo publicado ainda.
			{/if}
		</div>
	{/if}

	<div class="space-y-3">
		{#each data.aula.blocos as bloco (bloco.id)}
			<BlocoRender bloco={bloco} apostilaId={data.apostila.id} />
		{/each}
	</div>
</div>