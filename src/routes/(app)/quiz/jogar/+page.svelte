<script lang="ts">
	import CabecalhoPagina from '$lib/components/ui/CabecalhoPagina.svelte';
	import Campo from '$lib/components/ui/Campo.svelte';
	import Pagina from '$lib/components/ui/Pagina.svelte';
	import { TAMANHO_CODIGO } from '$lib/quiz';
	import type { PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: unknown }>();

	const retorno = $derived(form as { erro?: string; codigo?: string; nome?: string } | null);
	const erro = $derived(retorno?.erro ?? null);
	const codigoInicial = $derived(retorno?.codigo ?? data.codigo);
	const nomeInicial = $derived(retorno?.nome ?? '');
</script>

<svelte:head>
	<title>Entrar no quiz — mcurso</title>
</svelte:head>

<Pagina largura="estreito" espaco={4}>
	<CabecalhoPagina
		titulo="Entrar no quiz"
		subtitulo="Digite o código que o professor mostrou na tela."
	/>

	<form method="POST" action="?/entrar" class="card card-bordered p-6 space-y-4">
		<Campo rotulo="Código da sala" id="quiz-codigo">
			<input
				id="quiz-codigo"
				class="input input-bordered w-full text-center text-2xl font-black tracking-[0.3em] uppercase"
				type="text"
				name="codigo"
				value={codigoInicial}
				maxlength={TAMANHO_CODIGO}
				autocomplete="off"
				autocapitalize="characters"
				spellcheck="false"
				required
				placeholder="ABC123"
			/>
		</Campo>

		<Campo rotulo="Seu nome" id="quiz-nome" dica="aparece no placar">
			<input
				id="quiz-nome"
				class="input input-bordered w-full"
				type="text"
				name="nome"
				value={nomeInicial}
				maxlength="40"
				required
				placeholder="Como o professor te chama"
			/>
		</Campo>

		{#if erro}
			<div class="alert alert-error" role="alert">{erro}</div>
		{/if}

		<button class="btn btn-primary w-full" type="submit">Entrar</button>
	</form>
</Pagina>
