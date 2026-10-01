<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		rotulo: string;
		/** `for` do rótulo. Só use quando o campo controlado for mesmo esse `id`. */
		id?: string;
		/** Texto de apoio à direita do rótulo (`.label-text-alt`). */
		dica?: string;
		/** Conteúdo extra na linha do rótulo (ex.: o select de tema do Mermaid). */
		extra?: Snippet;
		class?: string;
		children: Snippet;
	};

	let { rotulo, id, dica, extra, class: className = '', children }: Props = $props();
</script>

<div class={`form-control ${className}`}>
	{#if extra}
		<!--
			Com `extra` a linha vira flex puro, sem o `.label`: o padding horizontal da
			lib empurraria o controle extra para dentro da borda do campo e ele deixaria
			de alinhar com a direita do `children` (a spec do Mermaid mede isso).
		-->
		<div class="flex flex-wrap items-center justify-between gap-2">
			{#if id}<label for={id}><span class="label-text">{rotulo}</span></label>{:else}<span
					class="label-text">{rotulo}</span
				>{/if}
			{@render extra()}
		</div>
	{:else}
		<div class="label">
			{#if id}
				<label for={id}><span class="label-text">{rotulo}</span></label>
			{:else}
				<span class="label-text">{rotulo}</span>
			{/if}
			{#if dica}
				<span class="label-text-alt">{dica}</span>
			{/if}
		</div>
	{/if}
	{@render children()}
</div>