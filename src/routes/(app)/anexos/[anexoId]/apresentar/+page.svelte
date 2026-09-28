<script lang="ts">
	import Apresentacao from '$lib/components/Apresentacao.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
</script>

<Apresentacao
	blocos={data.anexo.blocos}
	conteudoId={data.anexo.id}
	conteudoTitulo={data.anexo.titulo}
	contexto={{ tipo: 'anexo' }}
/>
