<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		/** Link de volta, à esquerda. Sem ele, o lado esquerdo fica vazio. */
		voltar?: { href: string; rotulo: string };
		/** Rótulo de apoio à esquerda (dica de uso, nome do bloco). */
		rotulo?: string;
		rotuloClass?: string;
		/** Some na impressão (a barra da página de impressão inteira não imprime). */
		noPrint?: boolean;
		/** Rótulo acessível do grupo de ações (vira `role="group"`). */
		acoesRotulo?: string;
		acoesClass?: string;
		class?: string;
		children?: Snippet;
	};

	let {
		voltar,
		rotulo,
		rotuloClass = 'text-xs opacity-60',
		noPrint = false,
		acoesRotulo,
		acoesClass = 'flex flex-wrap items-center gap-1',
		class: className = '',
		children
	}: Props = $props();
</script>

<div
	class={`flex flex-wrap items-center justify-between gap-2 ${noPrint ? 'no-print ' : ''}${className}`}
>
	{#if voltar}
		<a href={voltar.href} class="btn btn-ghost btn-sm">← {voltar.rotulo}</a>
	{:else if rotulo}
		<span class={rotuloClass}>{rotulo}</span>
	{/if}
	{#if children}
		<div class={acoesClass} role={acoesRotulo ? 'group' : undefined} aria-label={acoesRotulo}>
			{@render children()}
		</div>
	{/if}
</div>