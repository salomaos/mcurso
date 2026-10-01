<script lang="ts">
	import type { Snippet } from 'svelte';
	import TextoMatematico from './TextoMatematico.svelte';
	import type { SelecaoExercicio } from '$lib/conteudo';

	type Props = {
		/** Letra já calculada ("A", "B", ...). */
		letra: string;
		texto: string;
		tipo: SelecaoExercicio;
		/** `name` do input; o mesmo da questão para o POST agrupar as respostas. */
		name: string;
		value: number;
		/** Gabarito aparece (o aluno já respondeu). Fora disso é só o botão de escolha. */
		resultado?: boolean;
		marcada?: boolean;
		escolhida?: boolean;
		checked?: boolean;
		desabilitada?: boolean;
		/** Preview no editor: escolher aqui já corrige na hora (o POST real usa o form). */
		aoEscolher?: (indice: number) => void;
		/** Conteúdo extra dentro do rótulo (botão de remover, no editor). */
		children?: Snippet;
	};

	let {
		letra,
		texto,
		tipo,
		name,
		value,
		resultado = false,
		marcada = false,
		escolhida = false,
		checked,
		desabilitada = false,
		aoEscolher,
		children
	}: Props = $props();
</script>

<!--
	Aparência de botão porque a alternativa é clicável na totalidade (o input fica
	dentro do label). A cor conta a história: primária = ainda respondendo, success =
	gabarito, error = escolhida e errada, outline = neutra.
-->
<label
	class="btn btn-sm btn-block h-auto min-h-10 justify-start gap-2 whitespace-normal text-left"
	class:btn-primary={!resultado}
	class:btn-ghost={!resultado}
	class:btn-success={resultado && marcada}
	class:btn-error={resultado && escolhida && !marcada}
	class:btn-outline={resultado && !marcada && !escolhida}
>
	<input
		class={tipo === 'checkbox' ? 'checkbox checkbox-sm' : 'radio radio-sm'}
		type={tipo}
		{name}
		{value}
		aria-label={`Alternativa ${letra}`}
		{checked}
		disabled={desabilitada}
		onchange={() => aoEscolher?.(value)}
	/>
	<span class="text-xs opacity-60 font-bold">{letra})</span>
	<span><TextoMatematico {texto} /></span>
	{#if resultado}
		<span class="ml-auto flex shrink-0 gap-1 text-xs font-semibold uppercase">
			{#if marcada}<span class="badge badge-sm badge-success">gabarito</span>{/if}
			{#if escolhida}
				<span class="badge badge-sm {marcada ? 'badge-success' : 'badge-error'}">selecionada</span>
			{/if}
		</span>
	{/if}
	{@render children?.()}
</label>