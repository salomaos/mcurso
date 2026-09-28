<script lang="ts">
	import ImprimirConteudo from '$lib/components/ImprimirConteudo.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	const contexto = $derived({
		tipo: 'aula' as const,
		apostilaId: data.apostila.id,
		apostilaTitulo: data.apostila.titulo
	});
</script>

<ImprimirConteudo conteudo={data.aula} {contexto} />
