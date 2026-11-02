<script lang="ts">
	import { onMount } from 'svelte';
	import BlocoRender from '$lib/components/BlocoRender.svelte';
	import Icone from '$lib/components/Icone.svelte';
	import TextoMatematico from '$lib/components/TextoMatematico.svelte';
	import { corretasDoExercicio, type Blocos, type NivelTitulo } from '$lib/blocks';
	import { ROTULO_TIPO, rotasConteudo, type ContextoConteudo } from '$lib/conteudo';

	// Tamanho do texto do slide, escolhido pelo professor: persiste no navegador
	// (como o tema e a visão) porque o ajuste é da pessoa, não da apresentação.
	const CHAVE_ZOOM = 'mcurso:apresentacao-zoom';
	const ZOOM_MINIMO = 75;
	const ZOOM_MAXIMO = 500;

	let {
		blocos,
		conteudoId,
		conteudoTitulo,
		contexto,
		baseHref = '/apostilas'
	}: {
		blocos: Blocos;
		conteudoId: number;
		conteudoTitulo: string;
		contexto: ContextoConteudo;
		baseHref?: string;
	} = $props();

	let indice = $state(0);
	let revelado = $state(false);
	let mostrarAjuste = $state(false);
	let menuAberto = $state(false);
	let zoomPercentual = $state(100);
	const total = $derived(blocos.length);
	const bloco = $derived(blocos[indice] ?? null);

	// Slide é tela cheia: a escala é maior que a da leitura, mas segue a mesma
	// ordem (H1 maior, H6 menor) para o nível escolhido no editor continuar valendo.
	const TITULO_APRESENTACAO: Record<NivelTitulo, string> = {
		1: 'text-4xl sm:text-6xl font-bold text-center leading-tight',
		2: 'text-3xl sm:text-5xl font-bold text-center',
		3: 'text-2xl sm:text-4xl font-semibold text-center',
		4: 'text-xl sm:text-3xl font-semibold text-center',
		5: 'text-lg sm:text-2xl font-semibold text-center',
		6: 'text-base sm:text-xl font-medium uppercase tracking-wide text-center'
	};
	// Gabarito em lista: a questão pode ter mais de uma alternativa verdadeira.
	const gabarito = $derived(
		bloco?.tipo === 'exercicio' ? corretasDoExercicio(bloco) : ([] as number[])
	);
	const { proprio, voltar, apostilaId } = $derived(rotasConteudo(contexto, conteudoId, baseHref));

	function ir(delta: number) {
		indice = Math.min(total - 1, Math.max(0, indice + delta));
		revelado = false;
	}

	function irPara(destino: number) {
		indice = Math.min(total - 1, Math.max(0, destino));
		revelado = false;
		menuAberto = false;
	}

	function fechar() {
		location.href = proprio;
	}

	function ajustarZoom(valor: number) {
		zoomPercentual = valor;
		localStorage.setItem(CHAVE_ZOOM, String(valor));
	}

	onMount(() => {
		const salvo = Number(localStorage.getItem(CHAVE_ZOOM));
		if (Number.isInteger(salvo) && salvo >= ZOOM_MINIMO && salvo <= ZOOM_MAXIMO) {
			zoomPercentual = salvo;
		}

		function aoTeclar(e: KeyboardEvent) {
			const alvo = e.target as HTMLElement | null;
			if (menuAberto) {
				// A lista de slides captura o teclado: Esc só fecha ela (não a
				// apresentação) e as teclas de navegação ficam quietas até a
				// escolha — senão o slide troca com a lista aberta.
				if (e.key === 'Escape') {
					e.preventDefault();
					menuAberto = false;
				}
				return;
			}
			const tag = alvo?.tagName.toLowerCase() ?? '';
			// O guard de "campo de edição" protege quem está digitando (o caret
			// usa as setas). `input[type=range]` (o slider de zoom) não é campo de
			// edição: com ele focado, as teclas de navegação continuam valendo.
			const editavel =
				alvo?.isContentEditable ||
				['textarea', 'select'].includes(tag) ||
				(tag === 'input' && alvo?.getAttribute('type') !== 'range');
			if (editavel) return;
			if ((e.key === ' ' || e.key === 'Enter') && alvo?.closest('button, a, [role="application"]')) return;
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
</script>

<svelte:head>
	<title>Apresentar {ROTULO_TIPO[contexto.tipo].toLowerCase()} — {conteudoTitulo}</title>
</svelte:head>

<div class="fixed inset-0 z-50 bg-base-200 text-base-content flex flex-col">
	<!-- Barra superior -->
	<div class="flex items-center justify-between gap-2 px-4 py-2 border-b border-base-300 shrink-0">
		<div class="flex items-center gap-2 min-w-0">
			<a
				href={proprio}
				class="btn btn-ghost btn-xs"
				title="Fechar apresentação (Esc)"
			>✕ Fechar</a>
			<span class="text-xs opacity-60 truncate hidden sm:inline">{voltar.rotulo}</span>
			<span class="opacity-30 hidden sm:inline">/</span>
			<span class="text-xs font-semibold truncate">{conteudoTitulo}</span>
		</div>
		<div class="relative shrink-0">
			<button
				class="btn btn-ghost btn-xs tabular-nums"
				type="button"
				disabled={total === 0}
				aria-haspopup="true"
				aria-expanded={menuAberto}
				title="Ir para um slide"
				onclick={() => (menuAberto = !menuAberto)}
			>{indice + 1} / {total} <span class="opacity-50" aria-hidden="true">▾</span></button>
			{#if menuAberto}
				<!-- Fundo invisível: clicar fora fecha a lista. -->
				<button
					class="fixed inset-0 z-40 cursor-default"
					type="button"
					tabindex="-1"
					aria-label="Fechar lista de slides"
					onclick={() => (menuAberto = false)}
				></button>
				<div
					class="absolute right-0 top-full mt-1 z-50 card card-bordered p-2 shadow-lg max-h-64 min-w-20 overflow-y-auto"
					role="group"
					aria-label="Slides"
				>
					<div class="flex flex-col gap-1">
						{#each Array.from({ length: total }, (_, i) => i) as i (i)}
							<button
								class="btn btn-block btn-xs {i === indice ? '' : 'btn-ghost'}"
								type="button"
								aria-label={`Ir para o slide ${i + 1}`}
								aria-current={i === indice}
								onclick={() => irPara(i)}
							>{i + 1}</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Slide -->
	<main class="flex-1 overflow-y-auto grid place-items-center p-4 sm:p-10">
		{#if total === 0}
			<p class="opacity-50">Nenhum bloco nesta aula.</p>
		{:else}
			<div class="apresentacao-slide max-w-4xl w-full" style:zoom={zoomPercentual / 100}>
				{#key indice}
					<div class="flex flex-col items-center gap-0 w-full">
						{#if bloco && bloco.tipo === 'titulo'}
							<svelte:element this={`h${bloco.nivel}`} class={TITULO_APRESENTACAO[bloco.nivel]}>
								{bloco.texto}
							</svelte:element>
						{:else if bloco && bloco.tipo === 'exercicio'}
							<div class="space-y-6 w-full max-w-3xl">
								<h2 class="text-2xl sm:text-4xl font-bold leading-snug whitespace-pre-wrap text-center">
									<TextoMatematico texto={bloco.pergunta} />
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
												class="card p-4 {gabarito.includes(j)
													? 'border-2 border-success text-success'
													: 'opacity-70'}"
											>
												<div class="text-sm font-bold opacity-60">
													{String.fromCharCode(65 + j)})
												</div>
												<div><TextoMatematico texto={alternativa} /></div>
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
							<BlocoRender bloco={bloco} {apostilaId} {baseHref} />
						{/if}
					</div>
				{/key}
			</div>
		{/if}
	</main>

	<!-- Barra inferior -->
	<div class="flex items-center justify-between gap-2 px-4 py-2 border-t border-base-300 shrink-0">
		<span class="text-xs opacity-50 hidden sm:inline">←/→ ou Espaço navega · Esc fecha</span>
		<div class="flex items-center gap-2">
			<button
				class="btn btn-ghost btn-xs"
				type="button"
				aria-pressed={mostrarAjuste}
				aria-label="Ajustar tamanho do texto"
				title="Ajustar tamanho do texto"
				onclick={() => (mostrarAjuste = !mostrarAjuste)}
			>
				<Icone nome="ajustes" tamanho={16} />
			</button>
			{#if mostrarAjuste}
				<input
					class="range range-accent w-24 sm:w-32"
					type="range"
					min={ZOOM_MINIMO}
					max={ZOOM_MAXIMO}
					step="5"
					value={zoomPercentual}
					aria-label="Tamanho do texto do slide"
					oninput={(event) => ajustarZoom(Number((event.currentTarget as HTMLInputElement).value))}
				/>
				<button
					class="btn btn-ghost btn-xs"
					type="button"
					onclick={() => ajustarZoom(100)}
				>Redefinir</button>
			{/if}
		</div>
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
