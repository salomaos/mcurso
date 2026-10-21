<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import '../app.css';
	import '@ahmartecnologias/ahmardesign/ahmardesign.css';
	import 'highlight.js/styles/github.css';
	import 'katex/dist/katex.min.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import Rodape from '$lib/components/Rodape.svelte';
	import { iniciarTema } from '$lib/theme.svelte';
	import { iniciarVisao } from '$lib/visao.svelte';

	let { children, data } = $props();

	// Impressão e apresentação ocupam a tela inteira e não levam rodapé (a
	// impressão ainda esconde pelo `no-print`, mas a apresentação é tela navegável).
	const semRodape = $derived(
		page.url.pathname.endsWith('/imprimir') || page.url.pathname.endsWith('/apresentar')
	);

	onMount(async () => {
		// Helper JS da ahmardesign SÓ no cliente (acessa document.body/localStorage).
		await import('@ahmartecnologias/ahmardesign/ahmardesign.js');
		// Antes do init: o initTheme() da lib cairia no 'light' e trocaria o tema
		// padrão do SSR depois da primeira pintura.
		iniciarTema();
		// Lista ou grade nas listas de conteúdo (mesma preferência para aluno e
		// professor). Sem FOUC: só reposiciona cartões.
		iniciarVisao();
		window.AHMAR?.init();
	});
</script>

<div class="min-h-screen flex flex-col">
	<Navbar user={data.user} />

	<main class="flex-1">
		{@render children()}
	</main>

	{#if !semRodape}
		<Rodape />
	{/if}
</div>
