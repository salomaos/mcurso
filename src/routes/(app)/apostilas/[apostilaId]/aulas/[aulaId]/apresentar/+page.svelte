<script lang="ts">
	import Apresentacao from '$lib/components/Apresentacao.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	const contexto = $derived({
		tipo: 'aula' as const,
		apostilaId: data.apostila.id,
		apostilaTitulo: data.apostila.titulo
	});
</script>

<Apresentacao
	blocos={data.aula.blocos}
	conteudoId={data.aula.id}
	conteudoTitulo={data.aula.titulo}
	{contexto}
/>
