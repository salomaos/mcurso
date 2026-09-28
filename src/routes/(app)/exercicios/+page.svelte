<script lang="ts">
	import { caminhoExercicio, type ExercicioUi } from '$lib/conteudo';
	import type { PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: unknown }>();
	let busca = $state('');

	const erro = $derived((form as { erro?: string } | null)?.erro ?? null);

	function filtrar(titulo: string) {
		return !busca.trim() || titulo.toLowerCase().includes(busca.trim().toLowerCase());
	}

	const total = $derived(data.exercicios.length);
	const exercicios = $derived(
		(data.exercicios as ExercicioUi[]).filter((exercicio) => filtrar(exercicio.titulo))
	);

	function confirmar(titulo: string) {
		return (event: SubmitEvent) => {
			if (!confirm(`Excluir a atividade "${titulo}"?`)) event.preventDefault();
		};
	}
</script>

<svelte:head>
	<title>Atividades — mcurso</title>
</svelte:head>

<div class="container max-w-5xl px-4 py-6 space-y-4">
	<div class="flex flex-wrap items-start justify-between gap-2">
		<div class="space-y-1">
			<h1 class="text-3xl font-bold">Atividades</h1>
			<p class="text-sm opacity-70">
				Atividades de exercícios soltas, sem vínculo com apostila. O aluno responde tudo numa
				página e só vê o resultado — com gabarito e chave de integridade — no final.
			</p>
		</div>
		<form method="POST" action="?/criar">
			<button class="btn btn-primary" type="submit">+ Nova atividade</button>
		</form>
	</div>

	{#if erro}
		<div class="alert alert-error">{erro}</div>
	{/if}

	{#if total === 0}
		<div class="alert alert-info">
			Nenhuma atividade ainda. Crie a primeira montando as questões com blocos de exercício.
		</div>
	{:else}
		<div class="flex flex-wrap items-center justify-between gap-2">
			<span class="text-sm opacity-70">
				{total} {total === 1 ? 'atividade' : 'atividades'}
			</span>
			<input
				class="input input-sm input-bordered w-64"
				type="search"
				placeholder="Buscar por título..."
				aria-label="Buscar atividade por título"
				bind:value={busca}
			/>
		</div>
	{/if}

	{#if total > 0 && exercicios.length === 0}
		<div class="alert alert-info">Nada encontrado para "{busca}".</div>
	{/if}

	<ul class="space-y-2">
		{#each exercicios as exercicio (exercicio.id)}
			<li class="card card-bordered p-4 space-y-2">
				<div class="flex flex-wrap items-start justify-between gap-2">
					<div class="space-y-1 min-w-0">
						<a href={caminhoExercicio(exercicio.id)} class="card-title link">{exercicio.titulo}</a>
						{#if exercicio.descricao}
							<p class="text-sm opacity-80">{exercicio.descricao}</p>
						{/if}
					</div>
					<span class="badge badge-ghost text-xs shrink-0">
						{new Date(exercicio.updatedAt).toLocaleDateString('pt-BR')}
					</span>
				</div>

				<div class="flex flex-wrap items-center gap-2">
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
					{#if exercicio.referencias.length === 0}
						<span
							class="badge badge-warning gap-1"
							title="Nenhuma aula aponta para esta atividade: o aluno não chega nela por link."
						>
							Sem uso
						</span>
					{:else}
						<span class="badge badge-ghost">
							Usado em {exercicio.referencias.length}
							{exercicio.referencias.length === 1 ? 'aula' : 'aulas'}
						</span>
						<ul class="flex flex-wrap items-center gap-1">
							{#each exercicio.referencias as referencia (referencia.id)}
								<li>
									<a
										href={`/apostilas/${referencia.apostilaId}/aulas/${referencia.id}`}
										class="link text-xs opacity-70"
									>
										{referencia.titulo}
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				<div class="flex flex-wrap items-center gap-1">
					<a
						href={`${caminhoExercicio(exercicio.id)}/editar`}
						class="btn btn-outline btn-sm"
					>
						Editar
					</a>
					<a
						href={caminhoExercicio(exercicio.id)}
						class="btn btn-ghost btn-sm"
						target="_blank"
						title="Abrir como o aluno vê (aba anônima)"
					>
						Visualizar
					</a>
					<form
						method="POST"
						action="?/excluir"
						class="ml-auto"
						onsubmit={confirmar(exercicio.titulo)}
					>
						<input type="hidden" name="exercicioId" value={exercicio.id} />
						<button
							class="btn btn-ghost btn-sm"
							type="submit"
							disabled={exercicio.referencias.length > 0}
							title={exercicio.referencias.length > 0
								? 'Remova os links que apontam para esta atividade antes de excluí-la.'
								: 'Excluir atividade'}
						>
							Excluir
						</button>
					</form>
				</div>
			</li>
		{/each}
	</ul>
</div>
