<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { TEMA_MERMAID_PADRAO, type TemaMermaid } from '$lib/blocks';

	type Props = {
		diagrama: string;
		id: string;
		tema?: TemaMermaid;
	};

	let { diagrama, id, tema = TEMA_MERMAID_PADRAO }: Props = $props();

	const ZOOM_MINIMO = 0.25;
	const ZOOM_MAXIMO = 5;
	const PASSO_ZOOM = 1.25;
	const MARGEM = 24;
	const ESPACO_INTERNO = 32;
	const ATRASO_ATUALIZACAO = 350;

	let viewport = $state<HTMLDivElement>();
	let stage = $state<HTMLDivElement>();
	let container = $state<HTMLDivElement>();
	let carregando = $state(true);
	let atualizando = $state(false);
	let erro = $state<string | null>(null);
	let arrastando = $state(false);
	let larguraDiagrama = $state(0);
	let alturaDiagrama = $state(0);
	let zoom = $state(1);
	let deslocamentoX = $state(0);
	let deslocamentoY = $state(0);
	let ajusteAutomatico = $state(true);

	let sequencia = 0;
	let temporizador: ReturnType<typeof setTimeout> | undefined;
	let primeiraRenderizacao = true;

	const ponteiros = new Map<number, { x: number; y: number }>();
	let ponteiroAtivo: number | null = null;
	let ultimoX = 0;
	let ultimoY = 0;
	let distanciaAnterior = 0;
	let centroAnterior = { x: 0, y: 0 };

	function limitar(valor: number, minimo: number, maximo: number): number {
		return Math.min(maximo, Math.max(minimo, valor));
	}

	function limitarDeslocamento() {
		if (!viewport || larguraDiagrama <= 0 || alturaDiagrama <= 0) return;

		const larguraConteudo = larguraDiagrama * zoom;
		const alturaConteudo = alturaDiagrama * zoom;
		const minimoX = Math.min(MARGEM, viewport.clientWidth - larguraConteudo - MARGEM);
		const maximoX = Math.max(MARGEM, viewport.clientWidth - larguraConteudo - MARGEM);
		const minimoY = Math.min(MARGEM, viewport.clientHeight - alturaConteudo - MARGEM);
		const maximoY = Math.max(MARGEM, viewport.clientHeight - alturaConteudo - MARGEM);

		deslocamentoX = limitar(deslocamentoX, minimoX, maximoX);
		deslocamentoY = limitar(deslocamentoY, minimoY, maximoY);
	}

	function ajustarParaTela(marcarAutomatico = true) {
		if (marcarAutomatico) ajusteAutomatico = true;
		if (!viewport || larguraDiagrama <= 0 || alturaDiagrama <= 0) return;

		const larguraUtil = Math.max(1, viewport.clientWidth - ESPACO_INTERNO);
		const alturaUtil = Math.max(1, viewport.clientHeight - ESPACO_INTERNO);
		const escala = Math.min(1, larguraUtil / larguraDiagrama, alturaUtil / alturaDiagrama);
		const novoZoom = limitar(escala, ZOOM_MINIMO, ZOOM_MAXIMO);

		zoom = novoZoom;
		deslocamentoX = (viewport.clientWidth - larguraDiagrama * novoZoom) / 2;
		deslocamentoY = (viewport.clientHeight - alturaDiagrama * novoZoom) / 2;
		limitarDeslocamento();
	}

	function aoAjustarParaTela() {
		ajustarParaTela();
	}

	function aplicarZoom(
		proximoZoom: number,
		centroX = viewport?.clientWidth ? viewport.clientWidth / 2 : 0,
		centroY = viewport?.clientHeight ? viewport.clientHeight / 2 : 0
	) {
		if (!viewport) return;

		const zoomAnterior = zoom;
		const novoZoom = limitar(proximoZoom, ZOOM_MINIMO, ZOOM_MAXIMO);
		if (novoZoom === zoomAnterior) return;

		const proporcao = novoZoom / zoomAnterior;
		deslocamentoX = centroX - (centroX - deslocamentoX) * proporcao;
		deslocamentoY = centroY - (centroY - deslocamentoY) * proporcao;
		zoom = novoZoom;
		ajusteAutomatico = false;
		limitarDeslocamento();
	}

	function aumentarZoom() {
		aplicarZoom(zoom * PASSO_ZOOM);
	}

	function diminuirZoom() {
		aplicarZoom(zoom / PASSO_ZOOM);
	}

	function aoGirar(event: WheelEvent) {
		if (!viewport || larguraDiagrama <= 0) return;
		if (!event.ctrlKey) return;

		event.preventDefault();
		const rect = viewport.getBoundingClientRect();
		const unidade = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
		const delta = Math.max(-240, Math.min(240, event.deltaY * unidade));
		const fator = Math.exp((-delta / 100) * 0.2);
		aplicarZoom(zoom * fator, event.clientX - rect.left, event.clientY - rect.top);
	}

	function centroDosPrimeirosPonteiros() {
		const valores = [...ponteiros.values()];
		if (valores.length < 2) return null;
		return {
			x: (valores[0].x + valores[1].x) / 2,
			y: (valores[0].y + valores[1].y) / 2
		};
	}

	function distanciaEntrePonteiros() {
		const valores = [...ponteiros.values()];
		if (valores.length < 2) return 0;
		return Math.hypot(valores[0].x - valores[1].x, valores[0].y - valores[1].y);
	}

	function aoPressionar(event: PointerEvent) {
		if (!viewport || larguraDiagrama <= 0) return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;

		const rect = viewport.getBoundingClientRect();
		ponteiros.set(event.pointerId, { x: event.clientX - rect.left, y: event.clientY - rect.top });
		arrastando = true;

		if (ponteiros.size === 1) {
			ponteiroAtivo = event.pointerId;
			ultimoX = event.clientX;
			ultimoY = event.clientY;
		} else if (ponteiros.size === 2) {
			ponteiroAtivo = null;
			distanciaAnterior = distanciaEntrePonteiros();
			centroAnterior = centroDosPrimeirosPonteiros() ?? { x: 0, y: 0 };
		}

		try {
			viewport.setPointerCapture(event.pointerId);
		} catch {}
		event.preventDefault();
	}

	function aoMover(event: PointerEvent) {
		if (!viewport) return;
		const ponto = ponteiros.get(event.pointerId);
		if (ponteiroAtivo === null && ponteiros.size < 2) return;
		if (!ponto) return;

		const rect = viewport.getBoundingClientRect();
		ponto.x = event.clientX - rect.left;
		ponto.y = event.clientY - rect.top;

		if (ponteiros.size >= 2) {
			const distancia = distanciaEntrePonteiros();
			const centro = centroDosPrimeirosPonteiros() ?? centroAnterior;
			if (distanciaAnterior > 0 && distancia > 0) {
				const zoomAnterior = zoom;
				const novoZoom = limitar(
					zoomAnterior * (distancia / distanciaAnterior),
					ZOOM_MINIMO,
					ZOOM_MAXIMO
				);
				const proporcao = novoZoom / zoomAnterior;
				deslocamentoX = centro.x - (centroAnterior.x - deslocamentoX) * proporcao;
				deslocamentoY = centro.y - (centroAnterior.y - deslocamentoY) * proporcao;
				zoom = novoZoom;
				limitarDeslocamento();
			}
			distanciaAnterior = distancia;
			centroAnterior = centro;
		} else if (ponteiroAtivo === event.pointerId) {
			deslocamentoX += event.clientX - ultimoX;
			deslocamentoY += event.clientY - ultimoY;
			ultimoX = event.clientX;
			ultimoY = event.clientY;
			ajusteAutomatico = false;
			limitarDeslocamento();
		}

		event.preventDefault();
	}

	function aoSoltar(event: PointerEvent) {
		if (!ponteiros.has(event.pointerId)) return;
		ponteiros.delete(event.pointerId);

		if (ponteiroAtivo === event.pointerId) ponteiroAtivo = null;

		if (ponteiros.size === 1) {
			const [id, ponto] = [...ponteiros.entries()][0];
			const rect = viewport?.getBoundingClientRect();
			ponteiroAtivo = id;
			ultimoX = ponto.x + (rect?.left ?? 0);
			ultimoY = ponto.y + (rect?.top ?? 0);
			distanciaAnterior = 0;
		} else if (ponteiros.size === 0) {
			ponteiroAtivo = null;
			arrastando = false;
			distanciaAnterior = 0;
		}

		if (viewport?.hasPointerCapture(event.pointerId)) {
			viewport.releasePointerCapture(event.pointerId);
		}
	}

	function medirSvg(svg: SVGSVGElement) {
		const viewBox = svg
			.getAttribute('viewBox')
			?.trim()
			.split(/[\s,]+/)
			.map(Number);
		let largura = viewBox?.[2] ?? 0;
		let altura = viewBox?.[3] ?? 0;

		if (!(largura > 0) || !(altura > 0)) {
			try {
				const caixa = svg.getBBox();
				largura = caixa.width;
				altura = caixa.height;
			} catch {
				const caixa = svg.getBoundingClientRect();
				largura = caixa.width;
				altura = caixa.height;
			}
		}

		if (!(largura > 0) || !(altura > 0)) return false;
		larguraDiagrama = Math.ceil(largura);
		alturaDiagrama = Math.ceil(altura);
		svg.removeAttribute('width');
		svg.removeAttribute('height');
		svg.removeAttribute('style');
		svg.setAttribute('focusable', 'false');
		return true;
	}

	async function renderizar(definicao: string, tema: TemaMermaid, cancelado: () => boolean) {
		if (!container) return;

		const atual = ++sequencia;
		const inicial = larguraDiagrama === 0;
		if (inicial) {
			carregando = true;
			atualizando = false;
		} else {
			atualizando = true;
		}
		erro = null;

		try {
			const mermaid = (await import('mermaid')).default;
			mermaid.initialize({
				startOnLoad: false,
				theme: tema
			});
			const resultado = await mermaid.render(`mermaid-${id}-${atual}`, definicao);
			if (cancelado() || atual !== sequencia || !container) return;

			const anterior = container.innerHTML;
			container.innerHTML = resultado.svg;
			const svg = container.querySelector<SVGSVGElement>('svg');

			if (!svg || !medirSvg(svg)) {
				container.innerHTML = anterior;
				throw new Error('O Mermaid não retornou um SVG válido.');
			}

			resultado.bindFunctions?.(container);

			await tick();
			if (cancelado() || atual !== sequencia) return;
			if (ajusteAutomatico) ajustarParaTela(false);
		} catch (e) {
			if (cancelado() || atual !== sequencia) return;
			erro = `Erro ao renderizar diagrama: ${String(e)}`;
		} finally {
			if (!cancelado() && atual === sequencia) {
				carregando = false;
				atualizando = false;
			}
		}
	}

	function agendarAtualizacao(
		definicao: string,
		tema: TemaMermaid,
		cancelado: () => boolean
	) {
		atualizando = true;
		if (temporizador) clearTimeout(temporizador);
		temporizador = setTimeout(() => {
			temporizador = undefined;
			void renderizar(definicao, tema, cancelado);
		}, ATRASO_ATUALIZACAO);
	}

	onMount(() => {
		let cancelado = false;
		let observador: ResizeObserver | undefined;
		const canceladoAtivo = () => cancelado;

		void renderizar(diagrama, tema, canceladoAtivo);

		if (viewport) {
			viewport.addEventListener('dblclick', aoAjustarParaTela);
			viewport.addEventListener('wheel', aoGirar);
			viewport.addEventListener('pointerdown', aoPressionar);
			viewport.addEventListener('pointermove', aoMover);
			viewport.addEventListener('pointerup', aoSoltar);
			viewport.addEventListener('pointercancel', aoSoltar);
			viewport.addEventListener('lostpointercapture', aoSoltar);
		}

		if (viewport && typeof ResizeObserver !== 'undefined') {
			observador = new ResizeObserver(() => {
				if (!carregando && !erro) ajustarParaTela(false);
			});
			observador.observe(viewport);
		}

		return () => {
			cancelado = true;
			if (temporizador) clearTimeout(temporizador);
			sequencia++;
			observador?.disconnect();
			viewport?.removeEventListener('dblclick', aoAjustarParaTela);
			viewport?.removeEventListener('wheel', aoGirar);
			viewport?.removeEventListener('pointerdown', aoPressionar);
			viewport?.removeEventListener('pointermove', aoMover);
			viewport?.removeEventListener('pointerup', aoSoltar);
			viewport?.removeEventListener('pointercancel', aoSoltar);
			viewport?.removeEventListener('lostpointercapture', aoSoltar);
			ponteiros.clear();
			arrastando = false;
		};
	});

	$effect(() => {
		const definicao = diagrama;
		const temaAtual = tema;
		if (primeiraRenderizacao) {
			primeiraRenderizacao = false;
			return;
		}
		agendarAtualizacao(definicao, temaAtual, () => false);
	});
</script>

<div class="w-full">
	<div class="flex flex-wrap items-center justify-between gap-2 mb-2 no-print">
		<span class="text-xs opacity-60">Arraste para mover · Ctrl + roda para zoom</span>
		<div class="flex items-center gap-1" aria-label="Controles do diagrama">
			<button
				class="btn btn-xs btn-ghost"
				type="button"
				onclick={diminuirZoom}
				disabled={carregando || erro !== null}
				aria-label="Diminuir zoom"
				title="Diminuir zoom"
			>
				−
			</button>
		<span
			class="text-xs tabular-nums min-w-12 text-center"
			aria-label="Zoom atual"
			aria-live="polite"
		>
			{Math.round(zoom * 100)}%
		</span>
			<button
				class="btn btn-xs btn-ghost"
				type="button"
				onclick={aumentarZoom}
				disabled={carregando || erro !== null}
				aria-label="Aumentar zoom"
				title="Aumentar zoom"
			>
				+
			</button>
			<button
				class="btn btn-xs btn-outline"
				type="button"
				onclick={aoAjustarParaTela}
				disabled={carregando || erro !== null}
				aria-label="Ajustar diagrama à tela"
				title="Ajustar à tela"
			>
				Ajustar
			</button>
		</div>
	</div>

	<div
		bind:this={viewport}
		class="mermaid-viewport bg-base-200 border border-base-300 rounded-box"
		class:mermaid-arrastando={arrastando}
		role="region"
		aria-label="Diagrama Mermaid interativo"
		aria-busy={carregando || atualizando}
	>
		<div
			bind:this={stage}
			class="mermaid-stage"
			style={`width: ${larguraDiagrama}px; height: ${alturaDiagrama}px; transform: translate3d(${deslocamentoX}px, ${deslocamentoY}px, 0) scale(${zoom});`}
		>
			<div bind:this={container} class="mermaid-conteudo"></div>
		</div>

		{#if carregando}
			<div class="absolute inset-0 flex items-center justify-center text-sm opacity-60 pointer-events-none">
				Carregando diagrama…
			</div>
		{:else if erro}
			<div class="alert alert-error absolute inset-4 overflow-auto text-sm">{erro}</div>
		{/if}

		{#if atualizando}
			<div
				class="absolute bottom-2 right-2 badge badge-sm badge-outline no-print"
				aria-live="polite"
			>
				Atualizando…
			</div>
		{/if}
	</div>
</div>

<style>
	.mermaid-viewport {
		position: relative;
		height: min(58vh, 42rem);
		min-height: 16rem;
		overflow: hidden;
		cursor: grab;
		touch-action: none;
		user-select: none;
	}

	.mermaid-viewport.mermaid-arrastando {
		cursor: grabbing;
	}

	.mermaid-stage {
		position: absolute;
		top: 0;
		left: 0;
		transform-origin: 0 0;
		will-change: transform;
	}

	.mermaid-conteudo,
	.mermaid-conteudo :global(svg) {
		width: 100%;
		height: 100%;
	}

	.mermaid-conteudo :global(svg) {
		display: block;
		max-width: none;
	}

	@media (max-width: 640px) {
		.mermaid-viewport {
			height: 22rem;
		}
	}

	@media print {
		.mermaid-viewport {
			height: auto !important;
			min-height: 0 !important;
			overflow: visible !important;
			border: 0 !important;
			padding: 0 !important;
			cursor: default !important;
		}

		.mermaid-stage {
			position: static !important;
			width: 100% !important;
			height: auto !important;
			transform: none !important;
		}

		.mermaid-conteudo,
		.mermaid-conteudo :global(svg) {
			width: 100% !important;
			height: auto !important;
		}
	}
</style>
