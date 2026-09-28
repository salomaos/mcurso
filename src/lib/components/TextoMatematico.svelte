<script lang="ts">
	import Formula from './Formula.svelte';
	import { partesMatematicas } from '$lib/matematica';

	let { texto }: { texto: string } = $props();

	const partes = $derived(partesMatematicas(texto));
</script>

{#each partes as parte, indice (indice)}{#if parte.tipo === 'latex'}<Formula
			latex={parte.valor}
			destaque={false}
		/>{:else}<span class="whitespace-pre-wrap">{parte.valor}</span>{/if}{/each}
