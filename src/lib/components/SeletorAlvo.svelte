<script lang="ts">
	import type { BlocoLink } from '$lib/blocks';
	import { ROTULO_ALVO, type AlvoLink, type TipoAlvo } from '$lib/conteudo';

	type Props = {
		tipoLink: TipoAlvo;
		alvos: AlvoLink[];
		alvoId?: number;
		aoEscolher: (alvo: AlvoLink | null) => void;
	};

	let { tipoLink, alvos, alvoId, aoEscolher }: Props = $props();

	let busca = $state('');
	let aberto = $state(false);

	const vazio = $derived(
		tipoLink === 'aula'
			? 'Nenhuma aula nesta apostila.'
			: tipoLink === 'anexo'
				? 'Nenhum anexo criado ainda.'
				: 'Nenhuma atividade criada ainda.'
	);

	const filtrados = $derived(
		alvos.filter((alvo) => {
			if (!busca.trim()) return true;
			return `${alvo.titulo} ${alvo.detalhe ?? ''}`
				.toLowerCase()
				.includes(busca.trim().toLowerCase());
		})
	);

	const selecionado = $derived(alvos.find((alvo) => alvo.id === alvoId) ?? null);

	function escolher(alvo: AlvoLink | null) {
		aoEscolher(alvo);
		aberto = false;
		busca = '';
	}
</script>

<div class="space-y-2">
	{#if selecionado}
		<div class="flex flex-wrap items-center gap-2">
			<span class="badge badge-primary gap-1">
				<span class="text-xs uppercase">{ROTULO_ALVO[tipoLink]}</span>
				{selecionado.titulo}
			</span>
			{#if selecionado.detalhe}
				<span class="text-xs opacity-60">{selecionado.detalhe}</span>
			{/if}
			<button class="btn btn-ghost btn-xs" type="button" onclick={() => escolher(null)}>
				Trocar
			</button>
		</div>
	{:else}
		<input
			class="input input-sm input-bordered w-full"
			type="search"
			placeholder={`Buscar ${ROTULO_ALVO[tipoLink].toLowerCase()}...`}
			aria-label={`Buscar ${ROTULO_ALVO[tipoLink].toLowerCase()}`}
			bind:value={busca}
			onfocus={() => (aberto = true)}
		/>
		{#if aberto}
			<div class="max-h-48 overflow-y-auto rounded-box border border-base-300">
				{#if filtrados.length === 0}
					<p class="p-2 text-sm opacity-60">
						{alvos.length === 0 ? vazio : 'Nada encontrado.'}
					</p>
				{:else}
					{#each filtrados as alvo (alvo.id)}
						<button
							class="flex w-full flex-col items-start gap-0.5 border-b border-base-200 px-3 py-2 text-left last:border-b-0 hover:bg-base-200"
							type="button"
							onclick={() => escolher(alvo)}
						>
							<span class="truncate text-sm font-semibold">{alvo.titulo}</span>
							{#if alvo.detalhe}
								<span class="truncate text-xs opacity-60">{alvo.detalhe}</span>
							{/if}
						</button>
					{/each}
				{/if}
			</div>
		{/if}
	{/if}
</div>
