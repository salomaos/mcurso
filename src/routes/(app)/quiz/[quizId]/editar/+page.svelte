<script lang="ts">
	import EditorQuiz from '$lib/components/EditorQuiz.svelte';
	import type { PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: unknown }>();

	const erro = $derived((form as { erro?: string } | null)?.erro ?? null);
</script>

<svelte:head>
	<title>Editar quiz #{data.quiz.id} — mcurso</title>
</svelte:head>

<EditorQuiz quiz={data.quiz} novo={data.novo} {erro} />
