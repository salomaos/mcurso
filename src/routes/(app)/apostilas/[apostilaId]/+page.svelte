<script lang="ts">
	import { agruparPorSecao } from '$lib/blocks';
	import type { PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: unknown }>();

	const grupos = $derived(agruparPorSecao(data.aulas));

	function confirmar(id: number, titulo: string) {
		return confirm(`Excluir a aula "${titulo}"?`);
	}

	function confirmarApostila() {
		return confirm(`Excluir a apostila "${data.apostila.titulo}" e todas as suas aulas?`);
	}
</script>

<svelte:head>
	<title>{data.apostila.titulo} — mcurso</title>
</svelte:head>

<div class="container max-w-5xl px-4 py-6 space-y-6">
	<div class="flex items-center gap-2">
		<a href="/" class="btn btn-ghost btn-sm">← Apostilas</a>
		<span class="divider-horizontal opacity-40"></span>
		<span class="badge badge-outline">Apostila #{data.apostila.id}</span>
	</div>

	<header class="space-y-1">
		<h1 class="text-3xl font-bold">{data.apostila.titulo}</h1>
		{#if data.apostila.descricao}
			<p class="opacity-80">{data.apostila.descricao}</p>
		{/if}
	</header>

	{#if data.user}
		<!-- Identificação (somente professor) -->
		<div class="card card-bordered p-4 space-y-3">
			<form method="POST" action="?/renomear" class="flex flex-col gap-3">
				<div class="form-control">
					<label for="titulo" class="label"><span class="label-text">Título</span></label>
					<input
						id="titulo"
						name="titulo"
						class="input input-bordered"
						value={data.apostila.titulo}
						required
					/>
				</div>
				<div class="form-control">
					<label for="descricao" class="label"><span class="label-text">Descrição</span></label>
					<textarea id="descricao" name="descricao" class="textarea textarea-bordered max-w-full"
						>{data.apostila.descricao ?? ''}</textarea
					>
				</div>
				<div class="flex items-center gap-2">
					<button class="btn btn-primary btn-sm" type="submit">Salvar</button>
				</div>
			</form>
			<form
				method="POST"
				action="?/excluir"
				class="flex justify-end"
				onsubmit={() => confirmarApostila()}
			>
				<button class="btn btn-error btn-ghost btn-sm" type="submit">Excluir apostila</button>
			</form>
		</div>

		<!-- Nova aula (somente professor) -->
		<div class="card card-bordered p-4 space-y-3">
			<h2 class="card-title text-lg">Nova aula/encontro</h2>
			{#if form?.erroAula}
				<div class="alert alert-error">{form.erroAula}</div>
			{/if}
			<form method="POST" action="?/criarAula" class="flex flex-col gap-3">
				<div class="grid gap-3 sm:grid-cols-2">
					<div class="form-control">
						<input
							name="titulo"
							class="input input-bordered"
							placeholder="Título da aula"
							required
						/>
					</div>
					<div class="form-control">
						<input
							name="secao"
							class="input input-bordered"
							placeholder="Seção/bloco (opcional)"
							list="secoes"
						/>
						<datalist id="secoes">
							{#each grupos as g}
								{#if g.secao}
									<option value={g.secao}></option>
								{/if}
							{/each}
						</datalist>
					</div>
				</div>
				<div>
					<button class="btn btn-primary" type="submit">Criar e editar</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Aulas (visível para alunos e professor) -->
	<div class="space-y-6">
		{#each grupos as grupo, gi (grupo.secao ?? `#${gi}`)}
			<section class="space-y-2">
				{#if grupo.secao}
					<h2 class="text-xl font-bold border-b-2 border-base-300 pb-1">{grupo.secao}</h2>
				{/if}

				{#each grupo.aulas as aula (aula.id)}
					<div class="card card-bordered p-3 flex flex-col gap-2 sm:flex-row sm:items-center">
						<div class="flex-1">
							<div class="font-semibold">{aula.titulo}</div>
							{#if aula.descricao}
								<div class="text-sm opacity-70">{aula.descricao}</div>
							{/if}
						</div>

						<div class="flex flex-wrap items-center gap-1">
							<a
								href={`/apostilas/${data.apostila.id}/aulas/${aula.id}`}
								class="btn btn-ghost btn-xs"
							>
								Ver
							</a>
							<a
								href={`/apostilas/${data.apostila.id}/aulas/${aula.id}/imprimir`}
								target="_blank"
								class="btn btn-ghost btn-xs"
							>
								PDF
							</a>

							{#if data.user}
								<a
									href={`/apostilas/${data.apostila.id}/aulas/${aula.id}/editar`}
									class="btn btn-outline btn-xs"
								>
									Editar
								</a>

								<form method="POST" action="?/moverAula" class="flex">
									<input type="hidden" name="aulaId" value={aula.id} />
									<input type="hidden" name="direcao" value="cima" />
									<button class="btn btn-ghost btn-xs" title="Mover para cima">↑</button>
								</form>
								<form method="POST" action="?/moverAula" class="flex">
									<input type="hidden" name="aulaId" value={aula.id} />
									<input type="hidden" name="direcao" value="baixo" />
									<button class="btn btn-ghost btn-xs" title="Mover para baixo">↓</button>
								</form>

								<form
									method="POST"
									action="?/excluirAula"
									onsubmit={() => confirmar(aula.id, aula.titulo)}
								>
									<input type="hidden" name="aulaId" value={aula.id} />
									<button class="btn btn-error btn-ghost btn-xs">Excluir</button>
								</form>
							{/if}
						</div>
					</div>
				{/each}
			</section>
		{/each}

		{#if data.aulas.length === 0}
			<div class="alert alert-info">
				{#if data.user}
					Nenhuma aula ainda. Crie a primeira acima.
				{:else}
					Nenhuma aula publicada ainda.
				{/if}
			</div>
		{/if}
	</div>
</div>