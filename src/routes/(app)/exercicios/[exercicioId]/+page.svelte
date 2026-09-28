<script lang="ts">
	import { onMount } from 'svelte';
	import BlocoRender from '$lib/components/BlocoRender.svelte';
	import Dissertativa from '$lib/components/Dissertativa.svelte';
	import Questao from '$lib/components/Questao.svelte';
	import { resultadoParaImagem } from '$lib/imagem';
	import { guardarNome, lerNome } from '$lib/nome-aluno';
	import { caminhoExercicio, type Correcao, type CorrecaoQuestao } from '$lib/conteudo';
	import type { PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: unknown }>();

	type Resultado = {
		ok: true;
		nome: string;
		correcao: Correcao;
		chave: string;
		chaveFormatada: string;
		quando: string;
	};
	type Formulario = { erro?: string; nome?: string };

	const erro = $derived((form as Formulario | null)?.erro ?? null);
	// Depois do POST a mesma rota devolve o resultado; o formulário some.
	const resultado = $derived((form as Resultado | null)?.ok ? (form as Resultado) : null);
	// O nome vem do POST (quando houve erro de validação) ou do sessionStorage.
	const nomeDoPost = $derived(resultado?.nome ?? (form as Formulario | null)?.nome ?? '');
	// O nome é do POST quando a validação falhou, senão do sessionStorage do
	// navegador (preenchido no mount: `sessionStorage` não existe no SSR).
	let nome = $state('');
	let baixando = $state(false);

	const temPerguntas = $derived(
		data.atividade.questoes.length > 0 || data.atividade.dissertativas.length > 0
	);

	onMount(() => {
		nome = nomeDoPost || lerNome();
	});

	function digitarNome(event: Event) {
		nome = (event.currentTarget as HTMLInputElement).value;
		guardarNome(nome);
	}

	function questaoCorrigida(indice: number): CorrecaoQuestao | undefined {
		const id = data.atividade.questoes[indice]?.id;
		return resultado?.correcao.questoes.find((questao) => questao.id === id);
	}

	function respostaDissertativa(indice: number): string | undefined {
		const id = data.atividade.dissertativas[indice]?.id;
		const corrigida = resultado?.correcao.dissertativas.find((item) => item.id === id);
		return corrigida ? corrigida.resposta : undefined;
	}

	function baixarImagem() {
		if (!resultado) return;
		baixando = true;
		try {
			const arquivo = resultadoParaImagem({
				nome: resultado.nome,
				titulo: data.atividade.titulo,
				apostila: data.contexto.aula?.apostilaTitulo ?? null,
				aula: data.contexto.aula?.titulo ?? null,
				correcao: resultado.correcao,
				chave: resultado.chaveFormatada,
				quando: resultado.quando
			});
			const link = document.createElement('a');
			link.href = arquivo;
			link.download = `atividade-${data.atividade.id}.png`;
			link.click();
		} finally {
			baixando = false;
		}
	}
</script>

<svelte:head>
	<title>{data.atividade.titulo} — Atividade</title>
</svelte:head>

<div class="container max-w-3xl px-4 py-6 space-y-5">
	<header class="space-y-2">
		{#if data.contexto.aula}
			<nav aria-label="Origem" class="flex flex-wrap items-center gap-1 text-sm opacity-70">
				<span>{data.contexto.aula.apostilaTitulo}</span>
				<span aria-hidden="true">›</span>
				<span>{data.contexto.aula.titulo}</span>
			</nav>
		{/if}
		<span class="badge badge-outline">Atividade</span>
		<h1 class="text-3xl font-bold">{data.atividade.titulo}</h1>
		{#if data.atividade.descricao}
			<p class="opacity-80 whitespace-pre-wrap">{data.atividade.descricao}</p>
		{/if}
		{#if data.user}
			<div class="flex gap-1 no-print">
				<a href={`${caminhoExercicio(data.atividade.id)}/editar`} class="btn btn-outline btn-xs">
					Editar
				</a>
			</div>
		{/if}
	</header>

	{#if resultado}
		<div class="card card-bordered p-4 space-y-3 no-print quebra-pagina">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 class="text-2xl font-bold">
					{resultado.correcao.acertos}/{resultado.correcao.total} acertos
				</h2>
				<div class="flex flex-wrap gap-2">
					<button class="btn btn-outline btn-sm" type="button" onclick={() => window.print()}>
						Imprimir / PDF
					</button>
					<button class="btn btn-primary btn-sm" type="button" onclick={baixarImagem} disabled={baixando}>
						{baixando ? 'Gerando...' : 'Baixar imagem'}
					</button>
				</div>
			</div>
			{#if resultado.correcao.dissertativas.length > 0}
				<p class="text-xs opacity-70">
					As respostas discursivas vão impressas na sequência, para avaliação.
				</p>
			{/if}
			<p class="text-xs opacity-70">
				Guarde a chave abaixo (ela vem na imagem): permite conferir a nota depois, mesmo
				que o gabarito mude.
			</p>
			<p class="break-all font-mono text-xs">{resultado.chaveFormatada}</p>
		</div>

		{#if data.atividade.instrucoes.length > 0}
			<div class="space-y-3">
				{#each data.atividade.instrucoes as bloco (bloco.id)}
					<BlocoRender {bloco} />
				{/each}
			</div>
		{/if}

		<div class="space-y-3">
			{#each data.atividade.questoes as questao, indice (questao.id)}
				<Questao {questao} numero={indice + 1} resultado={questaoCorrigida(indice)} />
			{/each}
		</div>

		<div class="space-y-3">
			{#each data.atividade.dissertativas as dissertativa, indice (dissertativa.id)}
				<Dissertativa
					bloco={{ ...dissertativa, tipo: 'dissertativa' }}
					resposta={respostaDissertativa(indice)}
				/>
			{/each}
		</div>

		<div class="flex flex-wrap gap-2 no-print">
			<a href={caminhoExercicio(data.atividade.id)} class="btn btn-ghost btn-sm">
				Responder de novo
			</a>
		</div>
	{:else}
		{#if !temPerguntas}
			<div class="alert alert-info">Esta atividade ainda não tem perguntas.</div>
		{:else}
			<form method="POST" action="?/responder" class="space-y-4">
				<div class="form-control">
					<label class="label" for="nome-aluno">
						<span class="label-text">Seu nome</span>
						<span class="label-text-alt opacity-60">fica só neste navegador, até fechar</span>
					</label>
					<input
						id="nome-aluno"
						class="input input-bordered w-full"
						type="text"
						name="nome"
						maxlength="80"
						required
						value={nome}
						placeholder="Como está no caderno"
						oninput={digitarNome}
					/>
				</div>

				{#if data.atividade.instrucoes.length > 0}
					<div class="space-y-3">
						{#each data.atividade.instrucoes as bloco (bloco.id)}
							<BlocoRender {bloco} />
						{/each}
					</div>
				{/if}

				<div class="space-y-3">
					{#each data.atividade.questoes as questao, indice (questao.id)}
						<Questao {questao} numero={indice + 1} />
					{/each}
				</div>

				<div class="space-y-3">
					{#each data.atividade.dissertativas as dissertativa (dissertativa.id)}
						<Dissertativa bloco={{ ...dissertativa, tipo: 'dissertativa' }} campo="d_{dissertativa.id}" />
					{/each}
				</div>

				{#if erro}
					<div class="alert alert-error" role="alert">{erro}</div>
				{/if}

				<button class="btn btn-primary" type="submit">Enviar respostas</button>
			</form>
		{/if}
	{/if}
</div>
