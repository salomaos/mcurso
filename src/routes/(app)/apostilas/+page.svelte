<script lang="ts">
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
	<title>Apostilas — mcurso</title>
</svelte:head>

<div class="container max-w-5xl px-4 py-6 space-y-4">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">Apostilas</h1>
		<a href="/apostilas/nova" class="btn btn-primary">Nova apostila</a>
	</div>

	{#if data.apostilas.length === 0}
		<div class="alert alert-info">
			Nenhuma apostila ainda. Comece criando a primeira.
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
			</a>
		{/each}
	</div>
</div>