<script lang="ts">
	import PainelSoltos from '$lib/components/ui/PainelSoltos.svelte';
	import {
		caminhoExercicio,
		ROTULO_EDITAR,
		ROTULO_VISUALIZAR,
		type ExercicioUi
	} from '$lib/conteudo';
	import type { PageData } from './$types';

	type Item = ExercicioUi & { href: string };

	let { data, form } = $props<{ data: PageData; form: unknown }>();

	const erro = $derived((form as { erro?: string } | null)?.erro ?? null);

	const exercicios = $derived(
		(data.exercicios as ExercicioUi[]).map((exercicio): Item => ({
			...exercicio,
			href: caminhoExercicio(exercicio.id)
		}))
	);
</script>

<svelte:head>
	<title>Atividades — mcurso</title>
</svelte:head>

<PainelSoltos
	titulo="Atividades"
	singular="atividade"
	plural="atividades"
	descricao="Atividades de exercícios soltas, sem vínculo com apostila. O aluno responde tudo numa página e só vê o resultado — com gabarito e chave de integridade — no final."
	rotuloCriar="+ Nova atividade"
	rotuloBusca="Buscar atividade por título"
	rotuloVazio="Nenhuma atividade ainda. Crie a primeira montando as questões com blocos de exercício."
	nomeId="exercicioId"
	rotuloTipoExcluir="atividade"
	tituloSemUso="Nenhuma aula aponta para esta atividade: o aluno não chega nela por link."
	tituloEmUso="Remova os links que apontam para esta atividade antes de excluí-la."
	{erro}
	itens={exercicios}
>
	{#snippet marcadores(exercicio)}
		<span class="badge badge-ghost">
			{exercicio.questoes}
			{exercicio.questoes === 1 ? 'questão' : 'questões'}
		</span>
		{#if exercicio.discursivas > 0}
			<span class="badge badge-ghost">
				{exercicio.discursivas}
				{exercicio.discursivas === 1 ? 'dissertativa' : 'dissertativas'}
			</span>
		{/if}
		{#if exercicio.questoes === 0 && exercicio.discursivas === 0}
			<span class="badge badge-warning gap-1" title="Sem perguntas: o aluno não tem o que responder.">
				Sem perguntas
			</span>
		{/if}
	{/snippet}

	{#snippet acoes(item)}
		<a href={`${item.href}/editar`} class="btn btn-outline btn-sm">{ROTULO_EDITAR}</a>
		<a
			href={item.href}
			class="btn btn-ghost btn-sm"
			target="_blank"
			title="Abrir como o aluno vê (aba anônima)"
		>
			{ROTULO_VISUALIZAR}
		</a>
	{/snippet}
</PainelSoltos>