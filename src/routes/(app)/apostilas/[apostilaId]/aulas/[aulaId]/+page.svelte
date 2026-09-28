<script lang="ts">
	import VisualizarConteudo from '$lib/components/VisualizarConteudo.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	const contexto = $derived({
		tipo: 'aula' as const,
		apostilaId: data.apostila.id,
		apostilaTitulo: data.apostila.titulo
	});
</script>

<VisualizarConteudo
	conteudo={data.aula}
	{contexto}
	logado={Boolean(data.user)}
/>
