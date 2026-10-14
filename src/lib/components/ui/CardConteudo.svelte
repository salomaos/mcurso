<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Visao } from '$lib/visao.svelte';

	type Props = {
		/** Título do item. Com `href`, vira link. */
		titulo: string;
		href?: string | null;
		descricao?: string | null;
		/** `lista` = linha com ações à direita · `grade` = cartão empilhado. */
		modo: Visao;
		/** Alça de arrasto, no rodapé à esquerda das ações (só no editor). */
		alca?: Snippet;
		/** Slot à direita do título: data, contagens. */
		meta?: Snippet;
		/** Badges de contagem/aviso. */
		marcadores?: Snippet;
		/** Bloco auxiliar antes das ações (links reversos, por exemplo). */
		detalhe?: Snippet;
		/**
		 * Botões e links de ação. **Sem eles o cartão inteiro é o link de `href`**:
		 * botão dentro de link é HTML inválido, então aninhar ações obrigaria o
		 * título a ser o único link e o resto do cartão ficaria morto.
		 */
		acoes?: Snippet;
		class?: string;
		/** Atributos repassados ao cartão (`data-arrasto-item`, `id`, …). */
		rest?: Record<string, unknown>;
	};

	let {
		titulo,
		href = null,
		descricao = null,
		modo,
		alca,
		meta,
		marcadores,
		detalhe,
		acoes,
		class: className = '',
		rest
	}: Props = $props();

	const linkInteiro = $derived(Boolean(href) && !acoes);
	const lista = $derived(modo === 'lista');
</script>

<!--
	Cartão comum das listas de conteúdo (apostilas, aulas, anexos, atividades).
	Sem ações o cartão é o próprio `<a>` e o container da lista é um `div` (link
	dentro de `li` é o inverso do que o HTML aceita); com ações ele é `<li>` e o
	container é `ul`, que aceita `display: grid` nos dois modos.
-->
<svelte:element
	this={linkInteiro ? 'a' : 'li'}
	href={linkInteiro ? href : undefined}
	{...rest}
	class={`card card-bordered p-4 transition-colors ${className} ${
		lista ? 'flex items-start gap-2' : 'flex h-full flex-col gap-2'
	} ${linkInteiro ? 'hover:border-primary' : ''}`}
>
	<div class={`min-w-0 w-full flex-1 ${lista ? 'space-y-2' : 'flex flex-col gap-2'}`}>
		<div class="flex flex-wrap items-start justify-between gap-2">
			<div class="min-w-0 space-y-1">
				{#if linkInteiro}
					<div class="card-title">{titulo}</div>
				{:else if href}
					<a href={href} class="card-title link">{titulo}</a>
				{:else}
					<div class="card-title">{titulo}</div>
				{/if}
				{#if descricao}
					<p class="text-sm opacity-80" class:line-clamp-2={!lista}>{descricao}</p>
				{/if}
			</div>

			{#if meta}
				<div class="shrink-0">{@render meta()}</div>
			{/if}
		</div>

		{#if marcadores}
			<div class="flex flex-wrap items-center gap-2">{@render marcadores()}</div>
		{/if}

		{#if detalhe}
			<div>{@render detalhe()}</div>
		{/if}

		<!--
			Alça e ações no mesmo rodapé: a alça fica à esquerda dos botões, não
			mais sobre o título. `mt-auto` na grade cola o rodapé no fim do cartão.
		-->
		{#if alca || acoes}
			<div class={`flex flex-wrap items-center gap-1 ${lista ? '' : 'mt-auto pt-2'}`}>
				{#if alca}
					{@render alca()}
				{/if}
				{#if acoes}
					{@render acoes()}
				{/if}
			</div>
		{/if}
	</div>
</svelte:element>
