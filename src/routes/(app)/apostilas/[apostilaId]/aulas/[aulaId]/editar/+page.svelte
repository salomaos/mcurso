<script lang="ts">
	import EditorConteudo from '$lib/components/EditorConteudo.svelte';
	import type { PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: unknown }>();

	const erro = $derived((form as { erro?: string } | null)?.erro ?? null);
	const contexto = $derived({
		tipo: 'aula' as const,
		apostilaId: data.apostila.id,
		apostilaTitulo: data.apostila.titulo
	});
</script>

<EditorConteudo
	conteudo={data.aula}
	{contexto}
	secoes={data.secoes}
	alvos={data.alvos}
	novo={data.novo}
	{erro}
/>
