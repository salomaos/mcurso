<script lang="ts">
	import Icone from './Icone.svelte';
	import { TIPOS_BLOCO, type Bloco } from '$lib/blocks';

	type Props = {
		aoCriar: (tipo: Bloco['tipo']) => void;
		/** Nome acessível do grupo. O de baixo é contrato de E2E (`fluxo.spec.ts`). */
		rotuloGrupo?: string;
		class?: string;
	};

	let { aoCriar, rotuloGrupo = 'Adicionar bloco', class: className = '' }: Props = $props();
</script>

<div
	class={`flex flex-wrap justify-center gap-2 ${className}`}
	role="group"
	aria-label={rotuloGrupo}
>
	{#each TIPOS_BLOCO as tipo (tipo.id)}
		<button
			class="btn btn-sm btn-outline h-auto w-20 flex-col items-center gap-1 px-1 py-2"
			type="button"
			onclick={() => aoCriar(tipo.id)}
		>
			<Icone nome={tipo.icone} />
			<span class="text-xs leading-tight">{tipo.rotulo}</span>
		</button>
	{/each}
</div>