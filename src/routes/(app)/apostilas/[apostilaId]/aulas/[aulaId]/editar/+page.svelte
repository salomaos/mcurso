<script lang="ts">
	import EditorCanvas from '$lib/components/EditorCanvas.svelte';
	import type { Blocos } from '$lib/blocks';
	import type { PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: unknown }>();
	let modo = $state<'editar' | 'visualizar'>('editar');

	function valorInicial() {
		return {
			titulo: data.aula.titulo,
			descricao: data.aula.descricao ?? '',
			secao: data.aula.secao ?? '',
			blocos: data.aula.blocos
		};
	}

	let inicial = $state(valorInicial());
	let titulo = $state(inicial.titulo);
	let descricao = $state(inicial.descricao);
	let secao = $state(inicial.secao);
	let blocos = $state<Blocos>(inicial.blocos);

	function atualizarBlocos(novos: Blocos) {
		blocos = novos;
	}
</script>

<svelte:head>
	<title>Editar #{data.aula.id} — {data.apostila.titulo}</title>
</svelte:head>

<div class="container max-w-5xl px-4 py-6 space-y-4">
	<div class="flex items-center justify-between gap-2">
		<a href={`/apostilas/${data.apostila.id}/aulas/${data.aula.id}`} class="btn btn-ghost btn-sm">
			← Voltar para a aula
		</a>
		<span class="text-sm opacity-60">Aula #{data.aula.id} · Apostila "{data.apostila.titulo}"</span>
	</div>

	{#if form?.erro}
		<div class="alert alert-error">{form.erro}</div>
	{/if}

	<form method="POST" action="?/salvar" class="space-y-4">
		<div class="card card-bordered p-4 space-y-3">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 class="text-xl font-bold">Editor da aula</h1>
					<p class="text-sm opacity-60">
						{modo === 'editar' ? 'Edite diretamente na página.' : 'Visualização final do conteúdo.'}
					</p>
				</div>
				<div class="join" role="group" aria-label="Modo do editor">
					<button
						class:btn-primary={modo === 'editar'}
						class="btn btn-sm"
						type="button"
						aria-pressed={modo === 'editar'}
						onclick={() => (modo = 'editar')}
					>
						Editar
					</button>
					<button
						class:btn-primary={modo === 'visualizar'}
						class="btn btn-sm"
						type="button"
						aria-pressed={modo === 'visualizar'}
						onclick={() => (modo = 'visualizar')}
					>
						Visualizar
					</button>
				</div>
			</div>

			{#if modo === 'editar'}
				<div class="grid gap-3 sm:grid-cols-2">
					<div class="form-control">
						<label for="titulo" class="label"><span class="label-text">Título da aula</span></label>
						<input id="titulo" name="titulo" class="input input-bordered" required bind:value={titulo} />
					</div>
					<div class="form-control">
						<label for="secao" class="label"><span class="label-text">Seção/bloco</span></label>
						<input id="secao" name="secao" class="input input-bordered" bind:value={secao} placeholder="opcional" />
					</div>
				</div>
				<div class="form-control">
					<label for="descricao" class="label"><span class="label-text">Descrição</span></label>
					<textarea id="descricao" name="descricao" class="textarea textarea-bordered max-w-full" bind:value={descricao}></textarea>
				</div>
			{:else}
				<header class="space-y-2">
					{#if secao}
						<span class="badge badge-outline">{secao}</span>
					{/if}
					<h2 class="text-3xl font-bold">{titulo}</h2>
					{#if descricao}
						<p class="opacity-80">{descricao}</p>
					{/if}
				</header>
			{/if}
		</div>

		<EditorCanvas {blocos} atualizar={atualizarBlocos} apostilaId={data.apostila.id} {modo} />

		<input type="hidden" name="blocos" value={JSON.stringify(blocos)} />

		<div class="flex flex-wrap items-center gap-2">
			{#if modo === 'editar'}
				<button class="btn btn-primary" type="submit">Salvar aula</button>
			{:else}
				<button class="btn btn-outline" type="button" onclick={() => (modo = 'editar')}>
					Continuar editando
				</button>
			{/if}
			<a href={`/apostilas/${data.apostila.id}/aulas/${data.aula.id}`} class="btn btn-ghost">Cancelar</a>
		</div>
	</form>
</div>
