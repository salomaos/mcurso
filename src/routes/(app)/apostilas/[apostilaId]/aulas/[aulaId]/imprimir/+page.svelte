<script lang="ts">
	import BlocoRender from '$lib/components/BlocoRender.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
	<title>Imprimir — {data.aula.titulo}</title>
</svelte:head>

<div class="container max-w-3xl px-4 py-6 space-y-5 pt-8">
	<div class="no-print flex items-center justify-between gap-2">
		<a href={`/apostilas/${data.apostila.id}/aulas/${data.aula.id}`} class="btn btn-ghost btn-sm">
			← Voltar
		</a>
		<div class="flex gap-1">
			<button class="btn btn-primary btn-sm" onclick={() => window.print()}>Imprimir / salvar PDF</button>
		</div>
	</div>

	<div class="text-xs opacity-60 flex justify-between">
		<span>{data.apostila.titulo}</span>
		<span>Aula #{data.aula.id}</span>
	</div>

	<header class="mt-2 space-y-1">
		{#if data.aula.secao}
			<div class="text-sm uppercase tracking-wide opacity-60 font-semibold">{data.aula.secao}</div>
		{/if}
		<h1 class="text-3xl font-bold">{data.aula.titulo}</h1>
		{#if data.aula.descricao}
			<p class="opacity-80">{data.aula.descricao}</p>
		{/if}
		<hr class="border-base-300 my-2" />
	</header>

	<div class="space-y-3">
		{#each data.aula.blocos as bloco (bloco.id)}
			<BlocoRender bloco={bloco} apostilaId={data.apostila.id} />
		{/each}

		{#if data.aula.blocos.length === 0}
			<p class="opacity-60 italic">Aula sem conteúdo.</p>
		{/if}
	</div>
</div>