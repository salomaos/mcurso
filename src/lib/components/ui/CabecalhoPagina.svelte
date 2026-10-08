<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		titulo: string;
		/** Linha de apoio abaixo do título. As quebras de linha do texto são preservadas. */
		subtitulo?: string | null;
		/** Selo acima do título (seção da aula, tipo do conteúdo). Vazio = sem selo. */
		etiqueta?: string | null;
		/** Ações à direita (botão, link, form). */
		children?: Snippet;
		class?: string;
	};

	let { titulo, subtitulo = null, etiqueta = null, children, class: className = '' }: Props = $props();
</script>

<!--
	`<h1>` e não `h2`: as specs localizam o título da página por
	`getByRole('heading', { level: 1 })`. A etiqueta fica **fora** do `h1` para o
	nome acessível continuar sendo só o título.

	O subtítulo usa `whitespace-pre-wrap` de propósito: descrição é texto livre e
	quebra de linha digitada pelo autor tem que aparecer. Em texto de uma linha
	isso não muda nada.

	As ações **nunca caem para a linha de baixo**: o cabeçalho é `flex-nowrap` e a
	coluna do título é `min-w-0 flex-1`, então é o texto que encolhe e quebra
	(até o botão, que é `shrink-0`) — o botão de criar fica sempre à direita na
	mesma linha do título, com descrição longa ou curta. `break-words` cobre
	título sem espaço (senão ele transborda a coluna, já que não quebra).
	`ml-auto` no grupo de ações é a garantia de alinhamento à direita dentro da
	linha.
-->
<header class={`flex flex-nowrap items-start justify-between gap-4 ${className}`}>
	<div class="min-w-0 flex-1 space-y-1">
		{#if etiqueta}
			<span class="badge badge-outline">{etiqueta}</span>
		{/if}
		<h1 class="text-3xl font-bold break-words">{titulo}</h1>
		{#if subtitulo}
			<p class="opacity-80 whitespace-pre-wrap">{subtitulo}</p>
		{/if}
	</div>
	{#if children}
		<div class="ml-auto flex shrink-0 items-center gap-2">{@render children()}</div>
	{/if}
</header>