<script lang="ts">
	import { onMount } from 'svelte';
	import { markdownParaHtml } from '$lib/markdown';

	type Props = {
		/** Markdown do professor (o `bloco.conteudo`). */
		conteudo: string;
	};

	let { conteudo }: Props = $props();

	let html = $derived(markdownParaHtml(conteudo));
	let raiz = $state<HTMLElement>();

	// O bloco cercado do markdown já sai com `class="language-x"`, que é o que o
	// `Codigo.svelte` usa: mesmo highlight.js, mesmo CSS global, sem config nova.
	onMount(async () => {
		if (!raiz) return;
		const codigos = raiz.querySelectorAll('pre code[class*="language-"]');
		if (codigos.length === 0) return;
		const hljs = (await import('highlight.js')).default;
		for (const codigo of codigos) hljs.highlightElement(codigo as HTMLElement);
	});
</script>

{#if html !== ''}
	<div class="markdown" bind:this={raiz}>
		<!--
			Único `{@html}` de conteúdo do app. Seguro por construção: `$lib/markdown`
			escapa HTML bruto e só devolve tag do `marked` e do KaTeX.
		-->
		{@html html}
	</div>
{/if}