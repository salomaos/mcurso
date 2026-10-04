<script lang="ts">
	import Icone from './Icone.svelte';
	import TextoMarkdown from './TextoMarkdown.svelte';
	import type { NomeIcone } from '$lib/icones';

	type Props = {
		/** Markdown do bloco. Vai para o banco como string, igual à leitura. */
		conteudo: string;
		/**
		 * Bloco selecionado no canvas. É o gatilho de entrada: bloco novo já vem
		 * selecionado, então já abre editando com o cursor no fim do texto.
		 */
		ativo?: boolean;
		rotulo?: string;
		/** Entra em edição (o bloco também precisa ficar selecionado no canvas). */
		aoAtivar?: () => void;
		aoDigitar: (valor: string) => void;
		aoFocar?: () => void;
	};

	let {
		conteudo,
		ativo = false,
		rotulo = 'Texto do bloco',
		aoAtivar = () => {},
		aoDigitar,
		aoFocar = () => {}
	}: Props = $props();

	let campo = $state<HTMLTextAreaElement>();
	let editor = $state<HTMLDivElement>();
	let emEdicao = $state(false);
	let abrindo = false;
	let pressionado = false;
	let adiado = false;

	/**
	 * Entra editando. `abrindo` descarta o `cliqueFora` do **mesmo** clique: como o
	 * Svelte atualiza o DOM no microtask entre os listeners, o clique que criou o
	 * bloco (ou que abriu a prévia) chega no `window` já com o editor montado e
	 * fecharia na mesma hora.
	 */
	function entrar() {
		emEdicao = true;
		abrindo = true;
		setTimeout(() => (abrindo = false), 0);
	}

	// Fora da edição o bloco mostra o markdown já formatado, igual ao aluno: o
	// professor sai do texto cru sem precisar trocar de aba para conferir.
	$effect(() => {
		if (ativo) entrar();
	});

	/**
	 * Trocar editor por prévia muda a altura do bloco, então a troca **jamais** pode
	 * acontecer no meio de um clique: o `mousedown` no botão (Salvar, mover
	 * bloco…) já tira o foco do campo, o bloco encolhe ~80px, o `mouseup` cai fora
	 * do botão e o `click` não é nem disparado (o form não submetia). Por isso a
	 * saída por foco espera o ponteiro soltar, e o `cliqueFora` só age depois do
	 * `click`, quando a ação do botão já rodou.
	 */
	function sair() {
		emEdicao = false;
	}

	function perderFoco() {
		if (pressionado) {
			adiado = true;
			return;
		}
		sair();
	}

	function pressionarPonteiro() {
		pressionado = true;
	}

	function soltarPonteiro() {
		if (!pressionado) return;
		pressionado = false;
		if (!adiado) return;
		adiado = false;
		setTimeout(sair, 0);
	}

	/** Cobre o clique fora em área que não recebe foco (fundo da página, vão do canvas). */
	function cliqueFora(evento: MouseEvent) {
		if (!emEdicao || !editor || abrindo) return;
		if (evento.composedPath().includes(editor)) return;
		sair();
	}

	$effect(() => {
		if (!emEdicao) return;
		const alvo = campo;
		if (!alvo) return;
		alvo.focus();
		// O clique na leitura não tem posição de caret (o texto do clique é
		// markdown, o da tela é HTML): entra editando no fim.
		alvo.setSelectionRange(alvo.value.length, alvo.value.length);
	});

	function ativar() {
		entrar();
		aoAtivar();
	}

	// Qualquer marcador de bloco no começo da linha: o `prefixar` remove o que
	// existe antes de aplicar o novo, e considera a linha "marcada" para togglar.
	const MARCA_LINHA = /^\s*(?:[-*+]\s+|\d+[.)]\s+|>\s?|#{1,6}\s+)/;

	type Acao = { rotulo: string; icone: NomeIcone; aplicar: (campo: HTMLTextAreaElement) => void };

	// `setRangeText` (e não `value = …`) porque é o que entra no undo do browser:
	// Ctrl+Z desfaz a formatação. O `input` disparado na mão é o que faz o canvas
	// gravar o bloco; o pai devolve o mesmo valor, então o Svelte não reescreve o
	// DOM e o caret não pula.
	function escrever(
		el: HTMLTextAreaElement,
		de: number,
		ate: number,
		texto: string,
		selecaoInicio: number,
		selecaoFim: number
	) {
		el.setRangeText(texto, de, ate, 'end');
		el.setSelectionRange(selecaoInicio, selecaoFim);
		el.dispatchEvent(new Event('input', { bubbles: true }));
	}

	/** Envolve a seleção com a marca; sem seleção, deixa o caret no meio. */
	function envolver(marca: string) {
		return (el: HTMLTextAreaElement) => {
			const inicio = el.selectionStart;
			const fim = el.selectionEnd;
			const selecao = el.value.slice(inicio, fim);
			const antes = el.value.slice(0, inicio);
			const depois = el.value.slice(fim);
			if (antes.endsWith(marca) && depois.startsWith(marca)) {
				const limpo = antes.slice(0, -marca.length) + selecao + depois.slice(marca.length);
				escrever(el, inicio, fim, limpo, inicio - marca.length, fim - marca.length);
				return;
			}
			if (selecao === '') {
				escrever(el, inicio, fim, marca + marca, inicio + marca.length, inicio + marca.length);
				return;
			}
			escrever(
				el,
				inicio,
				fim,
				marca + selecao + marca,
				inicio + marca.length,
				fim + marca.length
			);
		};
	}

	/** Prefixo de linha (lista, citação), alternando se já existir. */
	function prefixar(prefixo: (indice: number) => string) {
		return (el: HTMLTextAreaElement) => {
			const inicio = el.value.lastIndexOf('\n', el.selectionStart - 1) + 1;
			const proxima = el.value.indexOf('\n', el.selectionEnd);
			const fim = proxima === -1 ? el.value.length : proxima;
			const linhas = el.value.slice(inicio, fim).split('\n');
			const jaMarcadas = linhas.every((linha) => MARCA_LINHA.test(linha));
			const texto = linhas
				.map((linha, indice) => {
					const limpa = linha.replace(MARCA_LINHA, '');
					return jaMarcadas ? limpa : prefixo(indice) + limpa;
				})
				.join('\n');
			// Caret colapsado no fim do trecho marcado (e não seleção em volta):
			// a próxima ação entra **depois** das linhas, sem substituir o texto
			// inteiro. Continuar selecionado só faz sentido no `envolver`.
			const caret = inicio + texto.length;
			escrever(el, inicio, fim, texto, caret, caret);
		};
	}

	function inserirLink(el: HTMLTextAreaElement) {
		const inicio = el.selectionStart;
		const fim = el.selectionEnd;
		const selecao = el.value.slice(inicio, fim);
		// Sem seleção entra um modelo e o caret cai na URL, que é o que falta preencher.
		const rotulo = selecao === '' ? 'link' : selecao;
		const url = selecao === '' ? 'https://' : '';
		const inicioUrl = inicio + 1 + rotulo.length + 2;
		escrever(el, inicio, fim, `[${rotulo}](${url})`, inicioUrl, inicioUrl + url.length);
	}

	/**
	 * Linha horizontal (`---`): precisa de linha própria, então só completa as que
	 * faltam. Insere no caret e **não** substitui a seleção (é uma linha nova, não
	 * uma formatação do texto escolhido).
	 */
	function inserirLinha(el: HTMLTextAreaElement) {
		const inicio = el.selectionStart;
		const antes = el.value.slice(0, inicio);
		const depois = el.value.slice(inicio);
		const completarQuebra = (texto: string, duplaNoInicio: boolean) => {
			const jaTemLinhaVazia = duplaNoInicio ? texto.startsWith('\n\n') : texto.endsWith('\n\n');
			if (texto === '' || jaTemLinhaVazia) return '';
			return texto.endsWith('\n') ? '\n' : '\n\n';
		};
		const abre = completarQuebra(antes, false);
		const fecha = completarQuebra(depois, true);
		const texto = `${abre}---${fecha}`;
		const caret = inicio + abre.length + 3 + fecha.length;
		escrever(el, inicio, inicio, texto, caret, caret);
	}

	const acoes: Acao[] = [
		{ rotulo: 'Negrito', icone: 'negrito', aplicar: envolver('**') },
		{ rotulo: 'Itálico', icone: 'italico', aplicar: envolver('*') },
		{ rotulo: 'Código', icone: 'codigo', aplicar: envolver('`') },
		{ rotulo: 'Lista', icone: 'lista', aplicar: prefixar(() => '- ') },
		{ rotulo: 'Lista numerada', icone: 'listaNumerada', aplicar: prefixar((i) => `${i + 1}. `) },
		{ rotulo: 'Citação', icone: 'citacao', aplicar: prefixar(() => '> ') },
		{ rotulo: 'Linha horizontal', icone: 'linha', aplicar: inserirLinha },
		{ rotulo: 'Link', icone: 'link', aplicar: inserirLink }
	];

	function acionar(acao: Acao) {
		if (!campo) return;
		campo.focus();
		acao.aplicar(campo);
	}

	function digitar(evento: Event) {
		aoDigitar((evento.currentTarget as HTMLTextAreaElement).value);
	}

	function pressionar(evento: KeyboardEvent) {
		// Mesmos atalhos de qualquer editor de texto.
		if (evento.ctrlKey || evento.metaKey) {
			const atalho = evento.key.toLowerCase();
			const acao = atalho === 'b' ? acoes[0] : atalho === 'i' ? acoes[1] : atalho === 'k' ? acoes[7] : null;
			if (acao) {
				evento.preventDefault();
				acionar(acao);
			}
			return;
		}
		// Sai da edição: o Esc volta para a leitura formatada na hora.
		if (evento.key === 'Escape') {
			evento.preventDefault();
			sair();
		}
	}

	function abrirPeloTeclado(evento: KeyboardEvent) {
		if (evento.key !== 'Enter' && evento.key !== ' ') return;
		evento.preventDefault();
		ativar();
	}
</script>

<svelte:window
	onpointerdown={pressionarPonteiro}
	onpointerup={soltarPonteiro}
	onpointercancel={soltarPonteiro}
	onclick={cliqueFora}
/>

{#if emEdicao}
	<div class="flex flex-col gap-1" bind:this={editor}>
		<!--
			Barra **grudada no topo da tela** (`sticky top-0`): o bloco rola junto com a
			página e, sem isso, a barra some junto com o topo dele no meio da edição.
			Fundo e sombra são para a barra continuar legível sobre o texto que passa por
			baixo. Funciona porque nenhum ancestral corta o `sticky` — o `.card` da lib
			tem `overflow: hidden`, mas o canvas fica fora dele, e `.canvas-bloco`
			também não tem `overflow`.
		-->
		<div
			class="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-box bg-base-100 p-1 shadow-sm no-print"
			role="group"
			aria-label="Formatação do texto"
		>
			{#each acoes as acao (acao.rotulo)}
				<button
					type="button"
					class="btn btn-ghost"
					title={acao.rotulo}
					aria-label={acao.rotulo}
					onmousedown={(evento) => evento.preventDefault()}
					onclick={() => acionar(acao)}
				>
					<Icone nome={acao.icone} tamanho={18} />
				</button>
			{/each}
		</div>

		<textarea
			class="textarea editor-texto"
			aria-label={rotulo}
			rows="3"
			placeholder="Escreva em markdown: **negrito**, *itálico*, - lista, $x^2$…"
			spellcheck="true"
			bind:this={campo}
			value={conteudo}
			oninput={digitar}
			onfocus={aoFocar}
			onfocusout={perderFoco}
			onkeydown={pressionar}
		></textarea>
	</div>
{:else}
	<!--
		Leitura com o mesmo componente do aluno. `role="button"` + `tabindex` porque
		conteúdo de bloco dentro de `<button>` é HTML inválido (o botão só aceita
		conteúdo de frase, e markdown gera `div`/`ul`/`pre`).
	-->
	<div
		class="cursor-text rounded-box px-1 py-0.5 hover:bg-base-200"
		role="button"
		tabindex="0"
		aria-label="Editar texto"
		onclick={ativar}
		onkeydown={abrirPeloTeclado}
	>
		<TextoMarkdown {conteudo} />
	</div>
{/if}

<style>
	/* `field-sizing` deixa o campo crescer com o texto no Chromium; nos outros
	   navegadores o `min-height` já evita o textarea de duas linhas. */
	.editor-texto {
		font-size: 1rem;
		line-height: 1.7;
		min-height: 3.5rem;
		field-sizing: content;
	}

	.editor-texto::placeholder {
		opacity: 0.5;
	}
</style>