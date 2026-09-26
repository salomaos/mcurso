<script lang="ts">
	type Props = {
		texto: string;
		tipo: 'titulo' | 'texto';
		nivel?: 1 | 2 | 3;
		aoDigitar: (valor: string) => void;
		aoFocar?: () => void;
		aoSair?: () => void;
	};

	let {
		texto,
		tipo,
		nivel = 2,
		aoDigitar,
		aoFocar = () => {},
		aoSair = () => {}
	}: Props = $props();

	let editando = $state(false);
	let rascunho = $state('');
	let elemento = $state<HTMLElement>();

	$effect(() => {
		if (!editando) rascunho = texto;
	});

	function valorAtual() {
		return elemento?.innerText.replaceAll('\u00a0', ' ') ?? texto;
	}

	function focar() {
		editando = true;
		aoFocar();
	}

	function digitar() {
		aoDigitar(valorAtual());
	}

	function sair() {
		aoDigitar(valorAtual());
		editando = false;
		aoSair();
	}

	function pressionar(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			elemento?.blur();
		}
	}

	function colar(event: ClipboardEvent) {
		event.preventDefault();
		const textoColado = event.clipboardData?.getData('text/plain') ?? '';
		document.execCommand('insertText', false, textoColado);
	}
</script>

{#if tipo === 'titulo' && nivel === 1}
	<h1
		class="canvas-titulo canvas-titulo-1"
		contenteditable="plaintext-only"
		bind:this={elemento}
		bind:innerText={rascunho}
		onfocus={focar}
		oninput={digitar}
		onblur={sair}
		onkeydown={pressionar}
		onpaste={colar}
		spellcheck="true"
	>{rascunho || texto}</h1>
{:else if tipo === 'titulo' && nivel === 3}
	<h3
		class="canvas-titulo canvas-titulo-3"
		contenteditable="plaintext-only"
		bind:this={elemento}
		bind:innerText={rascunho}
		onfocus={focar}
		oninput={digitar}
		onblur={sair}
		onkeydown={pressionar}
		onpaste={colar}
		spellcheck="true"
	>{rascunho || texto}</h3>
{:else if tipo === 'titulo'}
	<h2
		class="canvas-titulo canvas-titulo-2"
		contenteditable="plaintext-only"
		bind:this={elemento}
		bind:innerText={rascunho}
		onfocus={focar}
		oninput={digitar}
		onblur={sair}
		onkeydown={pressionar}
		onpaste={colar}
		spellcheck="true"
	>{rascunho || texto}</h2>
{:else}
	<div
		class="canvas-texto"
		contenteditable="plaintext-only"
		bind:this={elemento}
		bind:innerText={rascunho}
		role="textbox"
		aria-multiline="true"
		tabindex="0"
		onfocus={focar}
		oninput={digitar}
		onblur={sair}
		onkeydown={pressionar}
		onpaste={colar}
		spellcheck="true"
		aria-label="Texto do bloco"
	>{rascunho || texto}</div>
{/if}

<style>
	.canvas-titulo,
	.canvas-texto {
		cursor: text;
		outline: none;
		border-radius: calc(var(--rounded-box, 1rem) * 0.25);
		transition: background-color 120ms ease, box-shadow 120ms ease;
	}

	.canvas-titulo:hover,
	.canvas-texto:hover {
		background: color-mix(in srgb, currentColor 6%, transparent);
	}

	.canvas-titulo:focus,
	.canvas-texto:focus {
		background: color-mix(in srgb, currentColor 8%, transparent);
		box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 35%, transparent);
	}

	.canvas-titulo-1 {
		font-size: 1.875rem;
		font-weight: 700;
		line-height: 1.2;
	}

	.canvas-titulo-2 {
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1.25;
	}

	.canvas-titulo-3 {
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.3;
	}

	.canvas-texto {
		white-space: pre-wrap;
		line-height: 1.7;
		padding: 0.25rem 0.35rem;
	}
</style>
