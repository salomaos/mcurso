<script lang="ts">
	import BlocoRender from './BlocoRender.svelte';
	import type { Blocos } from '$lib/blocks';

	type Props = {
		blocos: Blocos;
		/** Necessário para link interno apontando para aula (a aula mora numa apostila). */
		apostilaId?: number;
		baseHref?: string;
		aulaContexto?: number;
		/** `imprimir` só muda o bloco de simulação (sai o código, não o canvas). */
		modo?: 'editar' | 'visualizar' | 'imprimir';
		class?: string;
	};

	let {
		blocos,
		apostilaId,
		baseHref,
		aulaContexto,
		modo = 'visualizar',
		class: className = 'space-y-3'
	}: Props = $props();
</script>

<div class={className}>
	{#each blocos as bloco (bloco.id)}
		<BlocoRender {bloco} {apostilaId} {baseHref} {aulaContexto} {modo} />
	{/each}
</div>