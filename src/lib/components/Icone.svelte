<script lang="ts">
	import { FORMAS_ICONE, type NomeIcone } from '$lib/icones';

	type Props = {
		nome: NomeIcone;
		tamanho?: number;
	};

	let { nome, tamanho = 20 }: Props = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={tamanho}
	height={tamanho}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.75"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"
>
	{#each FORMAS_ICONE[nome] as forma, indice (indice)}
		{#if forma.tipo === 'caminho'}
			<path d={forma.d} />
		{:else if forma.tipo === 'retangulo'}
			<rect
				x={forma.x}
				y={forma.y}
				width={forma.largura}
				height={forma.altura}
				rx={forma.raio ?? 0}
			/>
		{:else}
			<circle cx={forma.cx} cy={forma.cy} r={forma.raio} />
		{/if}
	{/each}
</svg>
