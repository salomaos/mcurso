<script lang="ts">
	import Campo from '$lib/components/ui/Campo.svelte';
	import { enviando } from '$lib/enviando';
	import type { ActionData } from './$types';

	let { form } = $props<{ form: ActionData }>();
</script>

<svelte:head>
	<title>Entrar — mcurso</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center px-4">
	<div class="card card-bordered p-6 w-full max-w-sm space-y-4">
		<div>
			<h1 class="text-2xl font-bold">mcurso</h1>
			<p class="opacity-70 text-sm">Digite a senha mestra para entrar.</p>
		</div>

		{#if form?.erro}
			<div class="alert alert-error">{form.erro}</div>
		{/if}

<form method="POST" action="?/entrar" class="flex flex-col gap-3" use:enviando>
			<Campo rotulo="Senha mestra" id="senha">
				<input
					id="senha"
					name="senha"
					type="password"
					class="input input-bordered"
					placeholder="·······"
					required
				/>
			</Campo>
			<button class="btn btn-primary btn-block" type="submit">Entrar</button>
		</form>
	</div>
</div>