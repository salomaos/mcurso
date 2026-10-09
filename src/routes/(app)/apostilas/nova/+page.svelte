<script lang="ts">
	import type { ActionData } from './$types';
	import Campo from '$lib/components/ui/Campo.svelte';
	import Pagina from '$lib/components/ui/Pagina.svelte';
	import { enviando } from '$lib/enviando';

	let { form } = $props<{ form: ActionData }>();
</script>

<svelte:head>
	<title>Nova apostila — mcurso</title>
</svelte:head>

<Pagina largura="estreito" espaco={4}>
	<div class="flex items-center gap-2">
		<a href="/apostilas" class="btn btn-ghost btn-sm">← Apostilas</a>
	</div>

	<h1 class="text-2xl font-bold">Nova apostila</h1>

	{#if form?.erro}
		<div class="alert alert-error">{form.erro}</div>
	{/if}

	<form method="POST" action="?/criar" class="card card-bordered p-4 flex flex-col gap-3" use:enviando>
		<Campo rotulo="Título" id="titulo">
			<input id="titulo" name="titulo" class="input input-bordered" required />
		</Campo>

		<Campo rotulo="Descrição (opcional)" id="descricao">
			<textarea id="descricao" name="descricao" class="textarea textarea-bordered w-full"></textarea>
		</Campo>

		<div class="flex gap-2">
			<button class="btn btn-primary" type="submit">Criar</button>
			<a href="/apostilas" class="btn btn-ghost">Cancelar</a>
		</div>
	</form>
</Pagina>