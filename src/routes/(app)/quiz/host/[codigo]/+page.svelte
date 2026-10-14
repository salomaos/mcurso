<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, untrack } from 'svelte';
	import CabecalhoPagina from '$lib/components/ui/CabecalhoPagina.svelte';
	import Pagina from '$lib/components/ui/Pagina.svelte';
	import { caminhoJogar, type EstadoQuizHost } from '$lib/quiz';
	import { buscarEstado, enviarAcao } from '$lib/quiz-cliente';

	let { data } = $props<{ data: { estado: EstadoQuizHost } }>();

	let estado = $state<EstadoQuizHost>(untrack(() => data.estado));
	let recebidoEm = $state(Date.now());
	let agora = $state(Date.now());
	let erro = $state<string | null>(null);
	let comandoEmAndamento = $state(false);

	const LETRAS = ['A', 'B', 'C', 'D'];
	const CORES = ['btn-error', 'btn-info', 'btn-warning', 'btn-success'];

	const restante = $derived(
		estado.status === 'pergunta'
			? Math.max(0, estado.tempoRestanteMs - (agora - recebidoEm))
			: 0
	);
	const segundos = $derived(Math.ceil(restante / 1000));
	const totalSegundos = $derived((estado.pergunta?.tempo ?? 1) * 1000);
	const progresso = $derived(totalSegundos > 0 ? (restante / totalSegundos) * 100 : 0);

	async function atualizar() {
		try {
			const novo = await buscarEstado(estado.codigo);
			if (novo.papel !== 'host') return;
			estado = novo;
			recebidoEm = Date.now();
			erro = null;
		} catch (causa) {
			erro = (causa as Error).message;
		}
	}

	async function comandar(acao: 'iniciar' | 'proxima' | 'encerrar') {
		comandoEmAndamento = true;
		try {
			await enviarAcao(estado.codigo, { acao });
			await atualizar();
		} catch (causa) {
			erro = (causa as Error).message;
		} finally {
			comandoEmAndamento = false;
		}
	}

	async function removerTudo() {
		if (!confirm('Sair e remover todos? A sala será apagada e os alunos desconectados.')) return;
		comandoEmAndamento = true;
		try {
			await enviarAcao(estado.codigo, { acao: 'sair' });
			await goto('/quiz');
		} catch (causa) {
			erro = (causa as Error).message;
			comandoEmAndamento = false;
		}
	}

	onMount(() => {
		const relogio = setInterval(() => (agora = Date.now()), 200);
		const sincronia = setInterval(atualizar, 1000);
		return () => {
			clearInterval(relogio);
			clearInterval(sincronia);
		};
	});
</script>

<svelte:head>
	<title>Sala {estado.codigo} — {estado.titulo}</title>
</svelte:head>

<Pagina largura="amplo" espaco={4}>
	<CabecalhoPagina
		titulo={estado.titulo}
		subtitulo={estado.descricao}
		etiqueta={`Sala ${estado.codigo}`}
	>
		<button
			class="btn btn-outline btn-sm"
			type="button"
			onclick={() => comandar('encerrar')}
			disabled={estado.encerrada || estado.status === 'fim' || comandoEmAndamento}
		>
			{estado.encerrada ? 'Entradas encerradas' : 'Encerrar o quiz'}
		</button>
		<button
			class="btn btn-ghost btn-sm text-error"
			type="button"
			onclick={removerTudo}
			disabled={comandoEmAndamento}
		>
			Sair e remover todos
		</button>
	</CabecalhoPagina>

	{#if erro}
		<div class="alert alert-error" role="alert">{erro}</div>
	{/if}

	{#if estado.encerrada && estado.status !== 'fim'}
		<div class="alert alert-info">
			Entradas encerradas: ninguém novo entra, mas quem já está na sala continua até o fim.
		</div>
	{/if}

	{#if estado.status === 'lobby'}
		<div class="card card-bordered p-6 space-y-4 text-center">
			<p class="opacity-70">Os alunos entram em</p>
			<a href={caminhoJogar()} class="link link-primary text-lg" target="_blank">
				/quiz/jogar
			</a>
			<p class="opacity-70">e digitam o código</p>
			<div class="text-5xl sm:text-6xl font-black tracking-[0.35em] select-all">
				{estado.codigo}
			</div>
			<p class="opacity-70">
				{estado.totalJogadores}
				{estado.totalJogadores === 1 ? 'jogador' : 'jogadores'} na sala ·
				{estado.totalPerguntas}
				{estado.totalPerguntas === 1 ? 'pergunta' : 'perguntas'}
			</p>

			{#if estado.jogadores.length > 0}
				<ul class="flex flex-wrap justify-center gap-2">
					{#each estado.jogadores as jogador (jogador.id)}
						<li class="badge badge-lg badge-outline">{jogador.nome}</li>
					{/each}
				</ul>
			{:else}
				<p class="opacity-60 text-sm">Aguardando os alunos entrarem...</p>
			{/if}

			<div>
				<button
					class="btn btn-primary btn-lg"
					class:loading={comandoEmAndamento}
					type="button"
					disabled={comandoEmAndamento}
					onclick={() => comandar('iniciar')}
				>
					Iniciar quiz
				</button>
			</div>
		</div>
	{/if}

	{#if estado.pergunta && (estado.status === 'pergunta' || estado.status === 'revelacao')}
		<div class="space-y-3">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<span class="badge badge-outline">
					Pergunta {estado.pergunta.numero} de {estado.totalPerguntas}
				</span>
				{#if estado.status === 'pergunta'}
					<span class="text-2xl font-bold tabular-nums">{segundos}s</span>
				{:else}
					<span class="badge badge-success">Resposta</span>
				{/if}
			</div>

			{#if estado.status === 'pergunta'}
				<progress class="progress progress-primary w-full" value={progresso} max="100"></progress>
			{/if}

			<h2 class="text-2xl font-bold whitespace-pre-wrap">{estado.pergunta.pergunta}</h2>

			<div class="grid gap-3 sm:grid-cols-2">
				{#each estado.pergunta.alternativas as alternativa, indice (indice)}
					<div
						class={`btn btn-lg h-auto justify-start normal-case text-left ${CORES[indice % CORES.length]} ${
							estado.status === 'revelacao' && indice !== estado.pergunta.correta ? 'opacity-40' : ''
						}`}
					>
						<!--
							`shrink-0` nos badges: sem ele o badge encolhe até o min-content e o
							texto dele quebra em duas linhas quando a alternativa é longa (quem
							cede espaço é o texto da alternativa, que já é `whitespace-normal`).
						-->
						<span class="badge badge-neutral shrink-0">{LETRAS[indice]}</span>
						<span class="whitespace-normal">{alternativa}</span>
						{#if estado.status === 'revelacao' && indice === estado.pergunta.correta}
							<span class="ml-auto badge badge-neutral shrink-0">correta</span>
						{/if}
					</div>
				{/each}
			</div>

			{#if estado.status === 'pergunta'}
				<p class="opacity-70">
					{estado.totalRespostas} de {estado.totalJogadores} responderam
				</p>
			{/if}
		</div>
	{/if}

	{#if estado.status === 'revelacao' && estado.ranking.length > 0}
		<div class="card card-bordered p-4 space-y-2">
			<h3 class="font-bold">Placar</h3>
			<ol class="space-y-1">
				{#each estado.ranking.slice(0, 5) as linha (linha.jogadorId)}
					<li class="flex items-center justify-between gap-2">
						<span>{linha.posicao}º {linha.nome}</span>
						<span class="font-mono">{linha.pontuacao}</span>
					</li>
				{/each}
			</ol>
			<div>
				<button
					class="btn btn-outline btn-sm"
					class:loading={comandoEmAndamento}
					type="button"
					disabled={comandoEmAndamento}
					onclick={() => comandar('proxima')}
				>
					Próxima pergunta
				</button>
			</div>
		</div>
	{/if}

	{#if estado.status === 'fim'}
		<div class="card card-bordered p-6 space-y-4">
			<h2 class="text-2xl font-bold text-center">Ranking final</h2>
			{#if estado.ranking.length === 0}
				<p class="opacity-70 text-center">Ninguém pontuou nesta partida.</p>
			{:else}
				<ol class="space-y-2">
					{#each estado.ranking as linha (linha.jogadorId)}
						<li
							class={`flex items-center justify-between gap-2 rounded-box p-3 ${
								linha.posicao === 1 ? 'bg-primary text-primary-content' : 'bg-base-200'
							}`}
						>
							<span class="font-bold">{linha.posicao}º {linha.nome}</span>
							<span class="font-mono">{linha.pontuacao}</span>
						</li>
					{/each}
				</ol>
			{/if}
			<div class="text-center">
				<a href="/quiz" class="btn btn-primary">Voltar aos quizzes</a>
			</div>
		</div>
	{/if}
</Pagina>
