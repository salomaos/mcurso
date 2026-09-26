<script lang="ts">
	import type { BlocoExercicio } from '$lib/blocks';

	type Modo = 'editar' | 'visualizar';
	let { bloco, modo = 'visualizar' }: { bloco: BlocoExercicio; modo?: Modo } = $props();

	let resposta = $state<number | null>(null);
	let mostrado = $state(false);

	$effect(() => {
		JSON.stringify([bloco.id, bloco.pergunta, bloco.alternativas, bloco.correta, bloco.explicacao]);
		resposta = null;
		mostrado = false;
	});
</script>

<fieldset class="card card-bordered p-4 space-y-3">
	<legend class="text-xs uppercase font-semibold opacity-60 px-1">Exercício</legend>

	<p class="font-semibold">{bloco.pergunta}</p>

	<div class="space-y-2">
		{#each bloco.alternativas as alternativa, idx}
			<button
				type="button"
				class="btn btn-sm btn-block justify-start whitespace-normal h-auto min-h-10"
				class:btn-primary={mostrado && idx === bloco.correta}
				class:btn-ghost={resposta === null || (mostrado && idx !== bloco.correta)}
				disabled={modo === 'editar' || mostrado}
				onclick={() => {
					if (modo === 'editar') return;
					resposta = idx;
					mostrado = true;
				}}
			>
				<span class="text-xs opacity-60 font-bold mr-1">{String.fromCharCode(65 + idx)})</span>
				<span>{alternativa}</span>
			</button>
		{/each}
	</div>

	{#if mostrado}
		<div class="alert {resposta === bloco.correta ? 'alert-success' : 'alert-error'} text-sm" role="status">
			{resposta === bloco.correta
				? 'Correto!'
				: `Incorreto — resposta certa: ${String.fromCharCode(65 + bloco.correta)}`}
		</div>
		{#if bloco.explicacao}
			<div class="text-sm opacity-80 whitespace-pre-wrap">{bloco.explicacao}</div>
		{/if}
		<button
			type="button"
			class="btn btn-ghost btn-xs"
			onclick={() => {
				resposta = null;
				mostrado = false;
			}}
		>
			Tentar novamente
		</button>
	{/if}
</fieldset>