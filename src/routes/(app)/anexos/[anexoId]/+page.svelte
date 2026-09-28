<script lang="ts">
	import VisualizarConteudo from '$lib/components/VisualizarConteudo.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
</script>

<VisualizarConteudo conteudo={data.anexo} contexto={{ tipo: 'anexo' }} logado={Boolean(data.user)} />
