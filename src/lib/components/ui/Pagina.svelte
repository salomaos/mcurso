<script lang="ts">
	import type { Snippet } from 'svelte';

	type Largura = 'estreito' | 'conteudo' | 'amplo';

	type Props = {
		/** `estreito` = criação · `conteudo` = leitura/impressão · `amplo` = edição/listagem */
		largura?: Largura;
		/** ritmo vertical entre os blocos irmãos */
		espaco?: 3 | 4 | 5 | 6;
		class?: string;
		children: Snippet;
	};

	let { largura = 'amplo', espaco = 4, class: className = '', children }: Props = $props();

	const LARGURAS: Record<Largura, string> = {
		estreito: 'max-w-2xl',
		conteudo: 'max-w-3xl',
		amplo: 'max-w-5xl'
	};
</script>

<!-- O padding lateral vem do próprio `.container` da lib (1rem): não repetir. -->
<div class={`container ${LARGURAS[largura]} py-6 space-y-${espaco} ${className}`}>
	{@render children()}
</div>