<script lang="ts">
	import BlocoRender from './BlocoRender.svelte';
	import { ROTULO_TIPO, rotasConteudo, type ContextoConteudo } from '$lib/conteudo';
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

<div class="container max-w-3xl px-4 py-6 space-y-5">
	<div class="flex items-center justify-between gap-2 no-print">
		<a href={voltar.href} class="btn btn-ghost btn-sm">← {voltar.rotulo}</a>
		<div class="flex gap-1">
			{#if logado}
				<a href={`${proprio}/editar`} class="btn btn-outline btn-sm">Editar</a>
			{/if}
			<a href={`${proprio}/imprimir`} class="btn btn-ghost btn-sm" target="_blank">Imprimir/PDF</a>
			<a
				href={`${proprio}/apresentar`}
				class="btn btn-sm"
				title="Modo apresentação (slides)"
			>
				Apresentar
			</a>
		</div>
	</div>

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

	<div class="space-y-3">
		{#each conteudo.blocos as bloco (bloco.id)}
			<BlocoRender {bloco} {apostilaId} {baseHref} {aulaContexto} />
		{/each}
	</div>
</div>
