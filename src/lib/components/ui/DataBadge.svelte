<script lang="ts">
	/** Data de criação/atualização como selo. Aparece no `meta` do `CardConteudo`. */
	type Props = {
		valor: Date | string;
		class?: string;
	};

	let { valor, class: className = '' }: Props = $props();
</script>

<span class={`badge badge-ghost text-xs shrink-0 ${className}`}>
	{new Date(valor).toLocaleDateString('pt-BR')}
</span>
