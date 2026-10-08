<script lang="ts">
	import Icone from '$lib/components/Icone.svelte';
	import { definirVisao, getVisao, type Visao } from '$lib/visao.svelte';

	const OPCOES: { valor: Visao; nome: 'lista' | 'grade'; rotulo: string }[] = [
		{ valor: 'lista', nome: 'lista', rotulo: 'Ver em lista' },
		{ valor: 'grade', nome: 'grade', rotulo: 'Ver em grade' }
	];

	let visao = $derived(getVisao());
</script>

<!--
	Mesmo padrão do seletor de nível do bloco de título (H1–H6): dois valores
	fixos num `join` de `btn btn-xs`, com `aria-pressed` no atual. O ícone é
	`aria-hidden`, então o nome acessível do botão vem do `aria-label` (o texto do
	`::before` do tooltip da lib não entra no nome acessível).
-->
<div class="join" role="group" aria-label="Modo de visualização">
	{#each OPCOES as opcao (opcao.valor)}
		<button
			class="btn btn-xs join-item tooltip tooltip-top"
			class:btn-active={visao === opcao.valor}
			type="button"
			data-tip={opcao.rotulo}
			aria-label={opcao.rotulo}
			aria-pressed={visao === opcao.valor}
			onclick={() => definirVisao(opcao.valor)}
		>
			<Icone nome={opcao.nome} tamanho={14} />
		</button>
	{/each}
</div>
