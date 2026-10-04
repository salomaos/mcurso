<script lang="ts">
	import { untrack } from 'svelte';
	import type { NivelTitulo } from '$lib/blocks';

	type Props = {
		texto: string;
		tipo: 'titulo' | 'texto';
		nivel?: NivelTitulo;
		rotulo?: string;
		marcador?: string;
		focarAoMontar?: boolean;
		aoDigitar: (valor: string) => void;
		aoFocar?: () => void;
		aoSair?: () => void;
	};

	let {
		texto,
		tipo,
		nivel = 2,
		rotulo = 'Texto do bloco',
		marcador = '',
		focarAoMontar = false,
		aoDigitar,
		aoFocar = () => {},
		aoSair = () => {}
	}: Props = $props();

	let editando = $state(false);
	let elemento = $state<HTMLElement>();
	let montou = $state(false);

	// `svelte:element` em vez de um `{#if}` por nível: trocar H2 para H4 troca só a
	// tag, e o `bind:this` + o efeito de baixo reescrevem o texto no elemento novo.
	const tagTitulo = $derived(`h${nivel}`);

	const inicial = untrack(() => texto);

	$effect(() => {
		const alvo = texto;
		if (editando) return;
		if (elemento && elemento.innerText !== alvo) elemento.innerText = alvo;
	});

	$effect(() => {
		if (montou) return;
		montou = true;
		if (!focarAoMontar) return;

		elemento?.focus();
		const selecao = window.getSelection();
		if (!selecao || !elemento) return;
		const intervalo = document.createRange();
		intervalo.selectNodeContents(elemento);
		selecao.removeAllRanges();
		selecao.addRange(intervalo);
		editando = true;
		aoFocar();
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

{#if tipo === 'titulo'}
	<svelte:element
		this={tagTitulo}
		class={`canvas-titulo canvas-titulo-${nivel}`}
		role="heading"
		aria-level={nivel}
		contenteditable="plaintext-only"
		data-marcador={marcador}
		aria-label={rotulo}
		bind:this={elemento}
		onfocus={focar}
		oninput={digitar}
		onblur={sair}
		onkeydown={pressionar}
		onpaste={colar}
		spellcheck="true"
	>{inicial}</svelte:element>
{:else}
	<div
		class="canvas-texto"
		contenteditable="plaintext-only"
		data-marcador={marcador}
		aria-label={rotulo}
		bind:this={elemento}
		role="textbox"
		aria-multiline="true"
		tabindex="0"
		onfocus={focar}
		oninput={digitar}
		onblur={sair}
		onkeydown={pressionar}
		onpaste={colar}
		spellcheck="true"
	>{inicial}</div>
{/if}

<style>
	.canvas-titulo,
	.canvas-texto {
		cursor: text;
		/* outline: none; */
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

	.canvas-titulo:empty::before,
	.canvas-texto:empty::before {
		content: attr(data-marcador);
		opacity: 0.5;
	}

	/* Tamanho por nível: espelha a escala do `BlocoRender` para o bloco não mudar de
	   tamanho ao sair da edição. H5/H6 descem para `text-base`/`text-sm` porque
	   abaixo de 1rem o título fica ilegível no canvas. */
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

	.canvas-titulo-4 {
		font-size: 1.125rem;
		font-weight: 600;
		line-height: 1.35;
	}

	.canvas-titulo-5 {
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.4;
	}

	.canvas-titulo-6 {
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.4;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.canvas-texto {
		white-space: pre-wrap;
		line-height: 1.7;
		padding: 0.25rem 0.35rem;
	}
</style>
