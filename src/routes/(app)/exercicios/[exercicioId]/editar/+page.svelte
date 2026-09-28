<script lang="ts">
	import EditorConteudo from '$lib/components/EditorConteudo.svelte';
	import { caminhoExercicio } from '$lib/conteudo';
	import type { PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: unknown }>();

	const erro = $derived((form as { erro?: string } | null)?.erro ?? null);
	const publico = $derived(caminhoExercicio(data.exercicio.id));
</script>

<EditorConteudo
	conteudo={data.exercicio}
	contexto={{ tipo: 'exercicio' }}
	secoes={[]}
	alvos={data.alvos}
	novo={data.novo}
	{erro}
/>

<div class="container max-w-5xl px-4 pb-8">
	<div class="alert alert-info text-sm">
		Esta é a página que o aluno responde. O gabarito nunca aparece nela: a
		correção acontece no servidor depois que ele envia.
		<a href={publico} class="link">Abrir a página do aluno</a>
	</div>
</div>
