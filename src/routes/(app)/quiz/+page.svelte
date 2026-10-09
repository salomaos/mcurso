<script lang="ts">
	import CardConteudo from '$lib/components/ui/CardConteudo.svelte';
	import CabecalhoPagina from '$lib/components/ui/CabecalhoPagina.svelte';
	import DataBadge from '$lib/components/ui/DataBadge.svelte';
	import Pagina from '$lib/components/ui/Pagina.svelte';
	import SeletorVisao from '$lib/components/ui/SeletorVisao.svelte';
	import { enviando } from '$lib/enviando';
	import { caminhoEditarQuiz, type QuizUi } from '$lib/quiz';
	import { classeLista, getVisao } from '$lib/visao.svelte';
	import type { PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: unknown }>();

	const erro = $derived((form as { erro?: string } | null)?.erro ?? null);
	let busca = $state('');
	const total = $derived(data.quizzes.length);
	let visao = $derived(getVisao());

	const visiveis = $derived(
		(data.quizzes as QuizUi[]).filter(
			(quiz) => !busca.trim() || quiz.titulo.toLowerCase().includes(busca.trim().toLowerCase())
		)
	);

	function aoDigitar(event: Event) {
		busca = (event.currentTarget as HTMLInputElement).value;
	}

	function confirmar(titulo: string) {
		return confirm(`Excluir o quiz "${titulo}"?`);
	}
</script>

<svelte:head>
	<title>Quiz — mcurso</title>
</svelte:head>

<Pagina largura="amplo" espaco={4}>
	<CabecalhoPagina
		titulo="Quiz"
		subtitulo="Perguntas de múltipla escolha no estilo Kahoot: abre a sala, o aluno entra com o código e a pontuação aparece ao vivo."
	>
		<form method="POST" action="?/criar" use:enviando>
			<button class="btn btn-primary" type="submit">+ Novo quiz</button>
		</form>
	</CabecalhoPagina>

	{#if erro}
		<div class="alert alert-error">{erro}</div>
	{/if}

	{#if total === 0}
		<div class="alert alert-info">
			Nenhum quiz ainda. Crie o primeiro e monte as perguntas no editor.
		</div>
	{:else}
		<div class="flex flex-wrap items-center justify-between gap-2">
			<span class="text-sm opacity-70">
				{visiveis.length}
				{visiveis.length === 1 ? 'quiz' : 'quizzes'}
			</span>
			<div class="flex flex-wrap items-center gap-2">
				<input
					class="input input-sm input-bordered w-64"
					type="search"
					placeholder="Buscar por título..."
					aria-label="Buscar quiz por título"
					value={busca}
					oninput={aoDigitar}
				/>
				<SeletorVisao />
			</div>
		</div>
	{/if}

	{#if total > 0 && visiveis.length === 0}
		<div class="alert alert-info">Nada encontrado para "{busca}".</div>
	{/if}

	<ul class={classeLista(visao)}>
		{#each visiveis as quiz (quiz.id)}
			<CardConteudo
				titulo={quiz.titulo}
				href={caminhoEditarQuiz(quiz.id)}
				descricao={quiz.descricao}
				modo={visao}
			>
				{#snippet meta()}
					<DataBadge valor={quiz.updatedAt} />
				{/snippet}

				{#snippet marcadores()}
					{#if quiz.totalPerguntas > 0}
						<span class="badge badge-ghost">
							{quiz.totalPerguntas}
							{quiz.totalPerguntas === 1 ? 'pergunta' : 'perguntas'}
						</span>
					{:else}
						<span class="badge badge-warning gap-1" title="Sem perguntas: não dá para iniciar.">
							Sem perguntas
						</span>
					{/if}
				{/snippet}

				{#snippet acoes()}
					<a href={caminhoEditarQuiz(quiz.id)} class="btn btn-outline btn-sm">Editar</a>
					<form method="POST" action="?/iniciar" use:enviando>
						<input type="hidden" name="quizId" value={quiz.id} />
						<button
							class="btn btn-primary btn-sm"
							type="submit"
							disabled={quiz.totalPerguntas === 0}
							title={quiz.totalPerguntas === 0 ? 'Adicione perguntas antes de iniciar' : 'Abrir a sala'}
						>
							Iniciar
						</button>
					</form>
					<form
						method="POST"
						action="?/excluir"
						class="ml-auto"
						use:enviando={{ confirmar: () => confirmar(quiz.titulo) }}
					>
						<input type="hidden" name="quizId" value={quiz.id} />
						<button class="btn btn-ghost btn-sm" type="submit">Excluir</button>
					</form>
				{/snippet}
			</CardConteudo>
		{/each}
	</ul>
</Pagina>
