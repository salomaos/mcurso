<script lang="ts">
	import type { ActionData } from './$types';

	let { form } = $props<{ form: ActionData }>();
</script>

<svelte:head>
	<title>Nova apostila — mcurso</title>
</svelte:head>

<div class="container max-w-2xl px-4 py-6 space-y-4">
	<div class="flex items-center gap-2">
		<a href="/apostilas" class="btn btn-ghost btn-sm">← Apostilas</a>
	</div>

	<h1 class="text-2xl font-bold">Nova apostila</h1>

	{#if form?.erro}
		<div class="alert alert-error">{form.erro}</div>
	{/if}

	<form method="POST" action="?/criar" class="card card-bordered p-4 flex flex-col gap-3">
		<div class="form-control">
			<label for="titulo" class="label"><span class="label-text">Título</span></label>
			<input id="titulo" name="titulo" class="input input-bordered" required />
		</div>

		<div class="form-control">
			<label for="descricao" class="label"><span class="label-text">Descrição (opcional)</span></label>
			<textarea id="descricao" name="descricao" class="textarea textarea-bordered max-w-full"></textarea>
		</div>

		<div class="flex gap-2">
			<button class="btn btn-primary" type="submit">Criar</button>
			<a href="/apostilas" class="btn btn-ghost">Cancelar</a>
		</div>
	</form>
</div>