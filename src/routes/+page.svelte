<script lang="ts">
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
	<title>Apostilas — mcurso</title>
</svelte:head>

<div class="container max-w-5xl px-4 py-6 space-y-4">
	<div class="flex items-center justify-between gap-2">
		<div class="space-y-1">
			<h1 class="text-3xl font-bold">Apostilas</h1>
			<p class="text-sm opacity-70">Material de aula para leitura e impressão.</p>
		</div>
		{#if data.user}
			<a href="/apostilas/nova" class="btn btn-primary">Nova apostila</a>
		{/if}
	</div>

	{#if data.apostilas.length === 0}
		<div class="alert alert-info">
			{#if data.user}
				Nenhuma apostila ainda. Comece criando a primeira.
			{:else}
				Nenhuma apostila publicada ainda.
			{/if}
		</div>
	{/if}

	<div class="grid gap-4 md:grid-cols-2">
		{#each data.apostilas as apostila (apostila.id)}
			<a
				href={`/apostilas/${apostila.id}`}
				class="card card-bordered p-4 hover:border-primary transition-colors"
			>
				<div class="flex items-start justify-between gap-2">
					<h2 class="card-title">{apostila.titulo}</h2>
					<span class="badge badge-ghost text-xs">
						{apostila.createdAt.toLocaleDateString('pt-BR')}
					</span>
				</div>
				{#if apostila.descricao}
					<p class="text-sm opacity-80 line-clamp-2">{apostila.descricao}</p>
				{/if}
				<p class="text-xs opacity-60">
					{apostila.totalAulas} {apostila.totalAulas === 1 ? 'aula' : 'aulas'}
				</p>
			</a>
		{/each}
	</div>
</div>