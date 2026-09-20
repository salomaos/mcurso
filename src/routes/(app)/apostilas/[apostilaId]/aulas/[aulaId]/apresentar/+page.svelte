<script lang="ts">
	import Apresentacao from '$lib/components/Apresentacao.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
</script>

<Apresentacao
	blocos={data.aula.blocos}
	apostilaId={data.apostila.id}
	apostilaTitulo={data.apostila.titulo}
	aulaId={data.aula.id}
	aulaTitulo={data.aula.titulo}
/>
