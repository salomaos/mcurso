<script lang="ts">
	import EditorBlocos from '$lib/components/EditorBlocos.svelte';
	import type { Blocos } from '$lib/blocks';
	import type { PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: unknown }>();

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

<div class="container max-w-3xl px-4 py-6 space-y-4">
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
			<div class="grid gap-3 sm:grid-cols-2">
				<div class="form-control">
					<label for="titulo" class="label"><span class="label-text">Título</span></label>
					<input id="titulo" name="titulo" class="input input-bordered" required bind:value={titulo} />
				</div>
				<div class="form-control">
					<label for="secao" class="label"><span class="label-text">Seção/bloco</span></label>
					<input id="secao" name="secao" class="input input-bordered" bind:value={secao} placeholder="opcional" />
				</div>
			</div>
			<div class="form-control">
				<label for="descricao" class="label"><span class="label-text">Descrição</span></label>
				<textarea id="descricao" name="descricao" class="textarea textarea-bordered" bind:value={descricao}></textarea>
			</div>
		</div>

		<EditorBlocos blocos={blocos} atualizar={atualizarBlocos} />

		<input type="hidden" name="blocos" value={JSON.stringify(blocos)} />

		<div class="flex items-center gap-2">
			<button class="btn btn-primary" type="submit">Salvar aula</button>
			<a href={`/apostilas/${data.apostila.id}/aulas/${data.aula.id}`} class="btn btn-ghost">Cancelar</a>
		</div>
	</form>
</div>