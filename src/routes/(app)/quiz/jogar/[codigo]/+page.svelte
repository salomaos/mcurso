<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import Pagina from '$lib/components/ui/Pagina.svelte';
	import type { EstadoQuizJogador } from '$lib/quiz';
	import { buscarEstado, enviarAcao } from '$lib/quiz-cliente';

	let { data } = $props<{ data: { estado: EstadoQuizJogador; jogadorId: string } }>();

	let estado = $state<EstadoQuizJogador>(untrack(() => data.estado));
	let recebidoEm = $state(Date.now());
	let agora = $state(Date.now());
	let erro = $state<string | null>(null);
	let enviando = $state(false);
	let encerrada = $state(false);

	const LETRAS = ['A', 'B', 'C', 'D'];
	const CORES = ['btn-error', 'btn-info', 'btn-warning', 'btn-success'];

	const restante = $derived(
		estado.status === 'pergunta'
			? Math.max(0, estado.tempoRestanteMs - (agora - recebidoEm))
			: 0
	);
	const segundos = $derived(Math.ceil(restante / 1000));

	async function atualizar() {
		if (encerrada) return;
		try {
			const novo = await buscarEstado(estado.codigo, data.jogadorId);
			if (novo.papel !== 'jogador') return;
			estado = novo;
			recebidoEm = Date.now();
			erro = null;
		} catch (causa) {
			const mensagem = (causa as Error).message;
			// Sala encerrada/temporada expirada: para de tentar e avisa.
			if (/não está mais|não encontrada/i.test(mensagem)) encerrada = true;
			erro = mensagem;
		}
	}

	async function responder(indice: number) {
		if (enviando || estado.status !== 'pergunta' || estado.jogador.respondeu) return;
		enviando = true;
		try {
			await enviarAcao(estado.codigo, { acao: 'responder', jogadorId: data.jogadorId, indice });
			await atualizar();
		} catch (causa) {
			erro = (causa as Error).message;
		} finally {
			enviando = false;
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
	<title>{estado.titulo} — Quiz</title>
</svelte:head>

<Pagina largura="conteudo" espaco={4}>
	<header class="flex flex-wrap items-center justify-between gap-2">
		<span class="font-bold">{estado.titulo}</span>
		<span class="badge badge-outline">
			{estado.jogador.nome} · {estado.jogador.pontuacao} pts
		</span>
	</header>

	{#if erro}
		<div class="alert alert-error" role="alert">{erro}</div>
	{/if}

	{#if estado.status === 'lobby'}
		<div class="card card-bordered p-6 space-y-3 text-center">
			<h1 class="text-2xl font-bold">Você está dentro, {estado.jogador.nome}!</h1>
			{#if estado.encerrada}
				<div class="alert alert-info">
					A sala foi encerrada para novas entradas, mas você continua. Aguarde o professor.
				</div>
			{:else}
				<p class="opacity-70">Aguardando o professor iniciar o quiz...</p>
			{/if}
			<p class="opacity-60 text-sm">
				{estado.totalJogadores}
				{estado.totalJogadores === 1 ? 'jogador' : 'jogadores'} na sala
			</p>
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
				{/if}
			</div>

			<h1 class="text-2xl font-bold whitespace-pre-wrap">{estado.pergunta.pergunta}</h1>

			<div class="grid gap-3">
				{#each estado.pergunta.alternativas as alternativa, indice (indice)}
					<button
						class={`btn btn-lg h-auto justify-start normal-case text-left ${CORES[indice % CORES.length]} ${
							estado.status === 'revelacao' && indice !== estado.pergunta.correta ? 'opacity-40' : ''
						} ${
							estado.jogador.escolhida === indice ? 'ring-4 ring-base-content/40' : ''
						}`}
						type="button"
						disabled={estado.status !== 'pergunta' || estado.jogador.respondeu || enviando}
						onclick={() => responder(indice)}
					>
						<span class="badge badge-neutral">{LETRAS[indice]}</span>
						<span class="whitespace-normal">{alternativa}</span>
						{#if estado.jogador.escolhida === indice}
							<span class="ml-auto badge badge-neutral">sua resposta</span>
						{/if}
						{#if estado.status === 'revelacao' && indice === estado.pergunta.correta}
							<span class="ml-auto badge badge-neutral">correta</span>
						{/if}
					</button>
				{/each}
			</div>

			{#if estado.status === 'pergunta' && estado.jogador.respondeu}
				<div class="alert alert-info">Resposta enviada! Aguarde os outros...</div>
			{/if}
		</div>
	{/if}

	{#if estado.status === 'revelacao'}
		<div class={`alert ${estado.jogador.acertou ? 'alert-success' : 'alert-warning'}`} role="status">
			{#if !estado.jogador.respondeu}
				Você não respondeu esta pergunta.
			{:else if estado.jogador.acertou}
				Acertou! +{estado.jogador.pontosNaPergunta} pontos.
			{:else}
				Dessa vez não. A resposta certa era a {LETRAS[estado.pergunta?.correta ?? 0]}.
			{/if}
		</div>
		<p class="text-sm opacity-70">
			Você está em {estado.jogador.posicao}º lugar com {estado.jogador.pontuacao} pontos.
		</p>
	{/if}

	{#if estado.status === 'fim'}
		<div class="card card-bordered p-6 space-y-4 text-center">
			<h1 class="text-2xl font-bold">Fim!</h1>
			<p class="text-lg">
				Você terminou em <span class="font-black">{estado.jogador.posicao}º</span> lugar com
				<span class="font-black">{estado.jogador.pontuacao}</span> pontos.
			</p>
			{#if estado.ranking.length > 0}
				<ol class="space-y-2 text-left">
					{#each estado.ranking.slice(0, 5) as linha (linha.jogadorId)}
						<li
							class={`flex items-center justify-between gap-2 rounded-box p-3 ${
								linha.jogadorId === estado.jogador.id ? 'bg-primary text-primary-content' : 'bg-base-200'
							}`}
						>
							<span class="font-bold">{linha.posicao}º {linha.nome}</span>
							<span class="font-mono">{linha.pontuacao}</span>
						</li>
					{/each}
				</ol>
			{/if}
			<a href="/quiz/jogar" class="btn btn-ghost">Entrar em outra sala</a>
		</div>
	{/if}
</Pagina>
