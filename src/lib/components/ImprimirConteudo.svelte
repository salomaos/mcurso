<script lang="ts">
	import BarraAcoes from './ui/BarraAcoes.svelte';
	import ListaBlocos from './ListaBlocos.svelte';
	import Pagina from './ui/Pagina.svelte';
	import {
		ROTULO_IMPRIMIR_PAGINA,
		ROTULO_TIPO,
		rotasConteudo,
		type ContextoConteudo
	} from '$lib/conteudo';
	import type { Blocos } from '$lib/blocks';

	type Conteudo = {
		id: number;
		titulo: string;
		descricao: string | null;
		blocos: Blocos;
		secao?: string | null;
	};

	type Props = {
		conteudo: Conteudo;
		contexto: ContextoConteudo;
		baseHref?: string;
	};

	let { conteudo, contexto, baseHref = '/apostilas' }: Props = $props();

	const rotulo = $derived(ROTULO_TIPO[contexto.tipo]);
	const { proprio, voltar, apostilaId } = $derived(rotasConteudo(contexto, conteudo.id, baseHref));
</script>

<svelte:head>
	<title>Imprimir - {conteudo.titulo}</title>
</svelte:head>

<Pagina largura="conteudo" espaco={5} class="pt-8">
	<BarraAcoes voltar={{ href: proprio, rotulo: 'Voltar' }} noPrint>
		<button class="btn btn-primary btn-sm" onclick={() => window.print()}>
			{ROTULO_IMPRIMIR_PAGINA}
		</button>
	</BarraAcoes>

	<div class="text-xs opacity-60 flex justify-between">
		<span>{voltar.rotulo}</span>
		<span>{rotulo} #{conteudo.id}</span>
	</div>

	<header class="mt-2 space-y-1">
		{#if conteudo.secao}
			<div class="text-sm uppercase tracking-wide opacity-60 font-semibold">{conteudo.secao}</div>
		{/if}
		<h1 class="text-3xl font-bold">{conteudo.titulo}</h1>
		{#if conteudo.descricao}
			<p class="opacity-80">{conteudo.descricao}</p>
		{/if}
		<hr class="border-base-300 my-2" />
	</header>

	<ListaBlocos blocos={conteudo.blocos} {apostilaId} {baseHref} modo="imprimir" />

	{#if conteudo.blocos.length === 0}
		<p class="opacity-60 italic">{rotulo} sem conteúdo.</p>
	{/if}
</Pagina>
