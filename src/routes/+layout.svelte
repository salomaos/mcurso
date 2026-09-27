<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import '@ahmartecnologias/ahmardesign/ahmardesign.css';
	import 'highlight.js/styles/github.css';
	import 'katex/dist/katex.min.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import { iniciarTema } from '$lib/theme.svelte';

	let { children, data } = $props();

	onMount(async () => {
		// Helper JS da ahmardesign SÓ no cliente (acessa document.body/localStorage).
		await import('@ahmartecnologias/ahmardesign/ahmardesign.js');
		// Antes do init: o initTheme() da lib cairia no 'light' e trocaria o tema
		// padrão do SSR depois da primeira pintura.
		iniciarTema();
		window.AHMAR?.init();
	});
</script>

<Navbar user={data.user} />

<main>
	{@render children()}
</main>