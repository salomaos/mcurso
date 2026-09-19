<script lang="ts">
	import { onMount } from 'svelte';

	let { latex, destaque = true } = $props();
	let el = $state<HTMLElement>();

	onMount(async () => {
		if (!el) return;
		const katex = (await import('katex')).default;
		try {
			el.innerHTML = katex.renderToString(latex, {
				displayMode: destaque,
				throwOnError: false
			});
		} catch {
			el.textContent = `Fórmula inválida: ${latex}`;
		}
	});
</script>

{#if destaque}
	<div class="my-3 overflow-x-auto py-2 flex justify-center" bind:this={el}></div>
{:else}
	<span class="px-0.5" bind:this={el}></span>
{/if}