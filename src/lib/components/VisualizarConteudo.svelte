<script lang="ts">
	import BarraAcoes from './ui/BarraAcoes.svelte';
	import ListaBlocos from './ListaBlocos.svelte';
	import Pagina from './ui/Pagina.svelte';
	import {
		ROTULO_APRESENTAR,
		ROTULO_EDITAR,
		ROTULO_IMPRIMIR,
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
		logado: boolean;
		baseHref?: string;
	};

	let { conteudo, contexto, logado, baseHref = '/apostilas' }: Props = $props();

	const rotulo = $derived(ROTULO_TIPO[contexto.tipo]);
	const { proprio, voltar, apostilaId } = $derived(rotasConteudo(contexto, conteudo.id, baseHref));
	// Só a aula tem onde "estar": é o contexto que o link de atividade registra.
	const aulaContexto = $derived(contexto.tipo === 'aula' ? conteudo.id : undefined);
</script>

<svelte:head>
	<title>{conteudo.titulo} — {voltar.rotulo}</title>
</svelte:head>

<Pagina largura="conteudo" espaco={5}>
	<BarraAcoes {voltar} noPrint>
		{#if logado}
			<a href={`${proprio}/editar`} class="btn btn-outline btn-sm">{ROTULO_EDITAR}</a>
		{/if}
		<a href={`${proprio}/imprimir`} class="btn btn-ghost btn-sm" target="_blank">
			{ROTULO_IMPRIMIR}
		</a>
		<a href={`${proprio}/apresentar`} class="btn btn-sm" title="Modo apresentação (slides)">
			{ROTULO_APRESENTAR}
		</a>
	</BarraAcoes>

	<header class="space-y-1">
		<span class="badge badge-outline">{conteudo.secao ?? rotulo}</span>
		<h1 class="text-3xl font-bold">{conteudo.titulo}</h1>
		{#if conteudo.descricao}
			<p class="opacity-80">{conteudo.descricao}</p>
		{/if}
	</header>

	{#if conteudo.blocos.length === 0}
		<div class="alert alert-info">
			{#if logado}
				{rotulo} sem blocos ainda.
				<a href={`${proprio}/editar`} class="link">Editar conteúdo</a>.
			{:else}
				{rotulo} sem conteúdo publicado ainda.
			{/if}
		</div>
	{/if}

	<ListaBlocos blocos={conteudo.blocos} {apostilaId} {baseHref} {aulaContexto} />
</Pagina>
