<script lang="ts">
	import ImprimirConteudo from '$lib/components/ImprimirConteudo.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
</script>

<ImprimirConteudo conteudo={data.anexo} contexto={{ tipo: 'anexo' }} />
