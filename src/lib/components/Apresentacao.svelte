<script lang="ts">
	import { onMount } from 'svelte';
	import BlocoRender from '$lib/components/BlocoRender.svelte';
	import type { Blocos } from '$lib/blocks';

	let {
		blocos,
		apostilaId,
		apostilaTitulo,
		aulaId,
		aulaTitulo,
		baseHref = '/apostilas'
	}: {
		blocos: Blocos;
		apostilaId: number;
		apostilaTitulo: string;
		aulaId: number;
		aulaTitulo: string;
		baseHref?: string;
	} = $props();

	let indice = $state(0);
	let revelado = $state(false);
	const total = $derived(blocos.length);
	const bloco = $derived(blocos[indice] ?? null);

	function ir(delta: number) {
		indice = Math.min(total - 1, Math.max(0, indice + delta));
		revelado = false;
	}

	function fechar() {
		location.href = `${baseHref}/${apostilaId}/aulas/${aulaId}`;
	}

	onMount(() => {
		function aoTeclar(e: KeyboardEvent) {
			if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') {
				e.preventDefault();
				ir(1);
			} else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {
				e.preventDefault();
				ir(-1);
			} else if (e.key === 'Escape') {
				e.preventDefault();
				fechar();
			}
		}
		window.addEventListener('keydown', aoTeclar);
		return () => window.removeEventListener('keydown', aoTeclar);
	});

	function ahrefRetorno() {
		return `${baseHref}/${apostilaId}/aulas/${aulaId}`;
	}
</script>

<svelte:head>
	<title>Apresentar — {aulaTitulo}</title>
</svelte:head>

<div class="fixed inset-0 z-50 bg-base-200 text-base-content flex flex-col">
	<!-- Barra superior -->
	<div class="flex items-center justify-between gap-2 px-4 py-2 border-b border-base-300 shrink-0">
		<div class="flex items-center gap-2 min-w-0">
			<a
				href={ahrefRetorno()}
				class="btn btn-ghost btn-xs"
				title="Fechar apresentação (Esc)"
			>✕ Fechar</a>
			<span class="text-xs opacity-60 truncate hidden sm:inline">{apostilaTitulo}</span>
			<span class="opacity-30 hidden sm:inline">/</span>
			<span class="text-xs font-semibold truncate">{aulaTitulo}</span>
		</div>
		<span class="text-xs opacity-60 tabular-nums shrink-0">{indice + 1} / {total}</span>
	</div>

	<!-- Slide -->
	<main class="flex-1 overflow-y-auto grid place-items-center p-4 sm:p-10">
		{#if total === 0}
			<p class="opacity-50">Nenhum bloco nesta aula.</p>
		{:else}
			<div class="max-w-4xl w-full">
				{#key indice}
					<div class="flex flex-col items-center gap-0 w-full">
						{#if bloco && bloco.tipo === 'titulo'}
							{#if bloco.nivel === 1}
								<h1 class="text-4xl sm:text-6xl font-bold text-center leading-tight">{bloco.texto}</h1>
							{:else if bloco.nivel === 3}
								<h3 class="text-2xl sm:text-4xl font-semibold text-center">{bloco.texto}</h3>
							{:else}
								<h2 class="text-3xl sm:text-5xl font-bold text-center">{bloco.texto}</h2>
							{/if}
						{:else if bloco && bloco.tipo === 'exercicio'}
							<div class="space-y-6 w-full max-w-3xl">
								<h2 class="text-2xl sm:text-4xl font-bold leading-snug whitespace-pre-wrap text-center">
									{bloco.pergunta}
								</h2>
								{#if !revelado}
									<button
										class="btn btn-primary btn-lg mx-auto block"
										onclick={() => (revelado = true)}
									>Revelar resposta</button>
								{:else}
									<div class="grid gap-3 sm:grid-cols-2">
										{#each bloco.alternativas as alternativa, j}
											<div
												class="card p-4 {j === bloco.correta
													? 'border-2 border-success text-success'
													: 'opacity-70'}"
											>
												<div class="text-sm font-bold opacity-60">
													{String.fromCharCode(65 + j)})
												</div>
												<div>{alternativa}</div>
											</div>
										{/each}
									</div>
									{#if bloco.explicacao}
										<div class="alert alert-info text-sm mx-auto max-w-2xl whitespace-pre-wrap">
											{bloco.explicacao}
										</div>
									{/if}
								{/if}
							</div>
						{:else if bloco}
							<BlocoRender bloco={bloco} apostilaId={apostilaId} baseHref={baseHref} />
						{/if}
					</div>
				{/key}
			</div>
		{/if}
	</main>

	<!-- Barra inferior -->
	<div class="flex items-center justify-between gap-2 px-4 py-2 border-t border-base-300 shrink-0">
		<span class="text-xs opacity-50 hidden sm:inline">←/→ ou Espaço navega · Esc fecha</span>
		<div class="flex items-center gap-1">
			<button
				class="btn btn-ghost btn-xs"
				type="button"
				disabled={indice === 0}
				onclick={() => ir(-1)}
			>← Anterior</button>
			<button
				class="btn btn-ghost btn-xs"
				type="button"
				disabled={indice >= total - 1}
				onclick={() => ir(1)}
			>Próximo →</button>
		</div>
	</div>
</div>
