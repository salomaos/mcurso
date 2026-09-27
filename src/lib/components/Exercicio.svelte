<script lang="ts">
	import TextoEditavel from './TextoEditavel.svelte';
	import type { Bloco, BlocoExercicio } from '$lib/blocks';

	type Modo = 'editar' | 'visualizar';
	type Props = {
		bloco: BlocoExercicio;
		modo?: Modo;
		atualizar?: (transformar: (atual: Bloco) => Bloco) => void;
	};

	let { bloco, modo = 'visualizar', atualizar }: Props = $props();

	let resposta = $state<number | null>(null);
	let mostrado = $state(false);

	const editando = $derived(modo === 'editar');

	$effect(() => {
		JSON.stringify([bloco.id, bloco.pergunta, bloco.alternativas, bloco.correta, bloco.explicacao]);
		resposta = null;
		mostrado = false;
	});

	function mudar(transformar: (atual: BlocoExercicio) => BlocoExercicio) {
		atualizar?.((atual) =>
			atual.tipo === 'exercicio' ? (transformar(atual) as Bloco) : atual
		);
	}

	function alterarPergunta(valor: string) {
		mudar((atual) => ({ ...atual, pergunta: valor }));
	}

	function alterarAlternativa(indice: number, valor: string) {
		mudar((atual) => {
			const alternativas = [...atual.alternativas];
			alternativas[indice] = valor;
			return { ...atual, alternativas };
		});
	}

	function marcarCorreta(indice: number) {
		mudar((atual) => ({ ...atual, correta: indice }));
	}

	function adicionarAlternativa() {
		mudar((atual) => ({ ...atual, alternativas: [...atual.alternativas, ''] }));
	}

	function removerAlternativa(indice: number) {
		mudar((atual) => {
			if (atual.alternativas.length <= 2) return atual;
			const alternativas = [...atual.alternativas];
			alternativas.splice(indice, 1);
			const correta =
				atual.correta === indice
					? Math.min(indice, alternativas.length - 1)
					: atual.correta > indice
						? atual.correta - 1
						: atual.correta;
			return { ...atual, alternativas, correta };
		});
	}

	function alterarExplicacao(valor: string) {
		mudar((atual) => ({ ...atual, explicacao: valor || undefined }));
	}

	function letra(indice: number) {
		return String.fromCharCode(65 + indice);
	}
</script>

<fieldset class="card card-bordered p-4 space-y-3">
	<legend class="text-xs uppercase font-semibold opacity-60 px-1">Exercício</legend>

	{#if editando}
		<div class="font-semibold">
			<TextoEditavel
				texto={bloco.pergunta}
				tipo="texto"
				rotulo="Enunciado do exercício"
				marcador="Enunciado do exercício"
				aoDigitar={alterarPergunta}
			/>
		</div>

		<div class="space-y-2">
			{#each bloco.alternativas as alternativa, indice (indice)}
				<div class="flex items-center gap-2">
					<span class="w-5 shrink-0 text-xs font-bold opacity-60">{letra(indice)})</span>
					<div class="min-w-0 flex-1">
						<TextoEditavel
							texto={alternativa}
							tipo="texto"
							rotulo={`Alternativa ${letra(indice)}`}
							marcador={`Alternativa ${letra(indice)}`}
							aoDigitar={(valor) => alterarAlternativa(indice, valor)}
						/>
					</div>
					<input
						class="radio radio-sm"
						type="radio"
						name={`correta-${bloco.id}`}
						checked={bloco.correta === indice}
						onchange={() => marcarCorreta(indice)}
						title="Marcar como correta"
						aria-label={`Marcar alternativa ${letra(indice)} como correta`}
					/>
					<button
						class="btn btn-ghost btn-xs"
						type="button"
						disabled={bloco.alternativas.length <= 2}
						title="Remover alternativa"
						aria-label={`Remover alternativa ${letra(indice)}`}
						onclick={() => removerAlternativa(indice)}
					>
						×
					</button>
				</div>
			{/each}
		</div>

		<div>
			<button class="btn btn-xs btn-ghost" type="button" onclick={adicionarAlternativa}>
				+ Alternativa
			</button>
		</div>

		<div class="space-y-1 border-t border-base-300 pt-2">
			<span class="text-xs font-semibold uppercase tracking-wide opacity-60">Explicação</span>
			<TextoEditavel
				texto={bloco.explicacao ?? ''}
				tipo="texto"
				rotulo="Explicação"
				marcador="Explicação (exibida após responder)"
				aoDigitar={alterarExplicacao}
			/>
		</div>
	{:else}
		<p class="font-semibold whitespace-pre-wrap">{bloco.pergunta}</p>

		<div class="space-y-2">
			{#each bloco.alternativas as alternativa, idx}
				<button
					type="button"
					class="btn btn-sm btn-block justify-start whitespace-normal h-auto min-h-10"
					class:btn-primary={mostrado && idx === bloco.correta}
					class:btn-ghost={resposta === null || (mostrado && idx !== bloco.correta)}
					disabled={mostrado}
					onclick={() => {
						resposta = idx;
						mostrado = true;
					}}
				>
					<span class="text-xs opacity-60 font-bold mr-1">{letra(idx)})</span>
					<span>{alternativa}</span>
				</button>
			{/each}
		</div>

		{#if mostrado}
			<div class="alert {resposta === bloco.correta ? 'alert-success' : 'alert-error'} text-sm" role="status">
				{resposta === bloco.correta
					? 'Correto!'
					: `Incorreto — resposta certa: ${letra(bloco.correta)}`}
			</div>
			{#if bloco.explicacao}
				<div class="text-sm opacity-80 whitespace-pre-wrap">{bloco.explicacao}</div>
			{/if}
			<button
				type="button"
				class="btn btn-ghost btn-xs"
				onclick={() => {
					resposta = null;
					mostrado = false;
				}}
			>
				Tentar novamente
			</button>
		{/if}
	{/if}
</fieldset>
