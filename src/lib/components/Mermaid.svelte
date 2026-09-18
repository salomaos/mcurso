<script lang="ts">
	import { onMount } from 'svelte';

	let { diagrama, id } = $props();
	let container = $state<HTMLElement>();

	onMount(async () => {
		if (!container) return;
		const mermaid = (await import('mermaid')).default;
		await mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
		try {
			const { svg } = await mermaid.render(`mmd-${id}`, diagrama);
			container.innerHTML = svg;
		} catch (e) {
			container.innerHTML = `<pre class="alert alert-error text-sm">Diagrama inválido: ${String(
				e
			)}</pre>`;
		}
	});
</script>

<div bind:this={container} class="overflow-auto"></div>