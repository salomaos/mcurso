<script lang="ts">
	import EditorConteudo from '$lib/components/EditorConteudo.svelte';
	import type { PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: unknown }>();

	const erro = $derived((form as { erro?: string } | null)?.erro ?? null);
</script>

<EditorConteudo
	conteudo={data.anexo}
	contexto={{ tipo: 'anexo' }}
	secoes={[]}
	alvos={data.alvos}
	novo={data.novo}
	{erro}
/>
