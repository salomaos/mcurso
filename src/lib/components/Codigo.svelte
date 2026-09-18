<script lang="ts">
	import { onMount } from 'svelte';

	let { codigo, linguagem } = $props();
	let el = $state<HTMLElement>();

	onMount(async () => {
		const hljs = (await import('highlight.js')).default;
		if (el && codigo) hljs.highlightElement(el);
	});
</script>

<pre class="rounded-box overflow-x-auto bg-base-300 p-4 text-sm"><code
		class="language-{linguagem}"
		bind:this={el}
	>{codigo}</code></pre>