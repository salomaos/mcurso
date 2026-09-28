<script lang="ts">
	import { caminhoAnexo, type AnexoUi } from '$lib/conteudo';
	import type { PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: unknown }>();
	let busca = $state('');

	const erro = $derived((form as { erro?: string } | null)?.erro ?? null);

	function filtrar(titulo: string) {
		return !busca.trim() || titulo.toLowerCase().includes(busca.trim().toLowerCase());
	}

	const total = $derived(data.anexos.length);
	const anexos = $derived(
		(data.anexos as AnexoUi[]).filter((anexo) => filtrar(anexo.titulo))
	);

	function confirmar(titulo: string) {
		return (event: SubmitEvent) => {
			if (!confirm(`Excluir o anexo "${titulo}"?`)) event.preventDefault();
		};
	}
</script>

<svelte:head>
	<title>Anexos — mcurso</title>
</svelte:head>

<div class="container max-w-5xl px-4 py-6 space-y-4">
	<div class="flex flex-wrap items-start justify-between gap-2">
		<div class="space-y-1">
			<h1 class="text-3xl font-bold">Anexos</h1>
			<p class="text-sm opacity-70">
				Material de apoio solto, sem vínculo com apostila. Use em qualquer aula colocando um
				bloco de link para o anexo.
			</p>
		</div>
		<form method="POST" action="?/criar">
			<button class="btn btn-primary" type="submit">+ Novo anexo</button>
		</form>
	</div>

	{#if erro}
		<div class="alert alert-error">{erro}</div>
	{/if}

	{#if total === 0}
		<div class="alert alert-info">
			Nenhum anexo ainda. Crie o primeiro para usar como material de apoio nas aulas.
		</div>
	{:else}
		<div class="flex flex-wrap items-center justify-between gap-2">
			<span class="text-sm opacity-70">
				{total} {total === 1 ? 'anexo' : 'anexos'}
			</span>
			<input
				class="input input-sm input-bordered w-64"
				type="search"
				placeholder="Buscar por título..."
				aria-label="Buscar anexo por título"
				bind:value={busca}
			/>
		</div>
	{/if}

	{#if total > 0 && anexos.length === 0}
		<div class="alert alert-info">Nada encontrado para "{busca}".</div>
	{/if}

	<ul class="space-y-2">
		{#each anexos as anexo (anexo.id)}
			<li class="card card-bordered p-4 space-y-2">
				<div class="flex flex-wrap items-start justify-between gap-2">
					<div class="space-y-1 min-w-0">
						<a href={caminhoAnexo(anexo.id)} class="card-title link">{anexo.titulo}</a>
						{#if anexo.descricao}
							<p class="text-sm opacity-80">{anexo.descricao}</p>
						{/if}
					</div>
					<span class="badge badge-ghost text-xs shrink-0">
						{new Date(anexo.updatedAt).toLocaleDateString('pt-BR')}
					</span>
				</div>

				<div class="flex flex-wrap items-center gap-2">
					{#if anexo.referencias.length === 0}
						<span
							class="badge badge-warning gap-1"
							title="Nenhuma aula aponta para este anexo: o aluno não consegue chegar nele."
						>
							Sem uso
						</span>
					{:else}
						<span class="badge badge-ghost">
							Usado em {anexo.referencias.length}
							{anexo.referencias.length === 1 ? 'aula' : 'aulas'}
						</span>
						<ul class="flex flex-wrap items-center gap-1">
							{#each anexo.referencias as referencia (referencia.id)}
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
					<a
						href={`${caminhoAnexo(anexo.id)}/editar`}
						class="btn btn-outline btn-sm"
					>
						Editar
					</a>
					<a
						href={`${caminhoAnexo(anexo.id)}/imprimir`}
						class="btn btn-ghost btn-sm"
						target="_blank"
					>
						Imprimir/PDF
					</a>
					<a href={`${caminhoAnexo(anexo.id)}/apresentar`} class="btn btn-ghost btn-sm">
						Apresentar
					</a>
					<form
						method="POST"
						action="?/excluir"
						class="ml-auto"
						onsubmit={confirmar(anexo.titulo)}
					>
						<input type="hidden" name="anexoId" value={anexo.id} />
						<button
							class="btn btn-ghost btn-sm"
							type="submit"
							disabled={anexo.referencias.length > 0}
							title={anexo.referencias.length > 0
								? 'Remova os links que apontam para este anexo antes de excluí-lo.'
								: 'Excluir anexo'}
						>
							Excluir
						</button>
					</form>
				</div>
			</li>
		{/each}
	</ul>
</div>
