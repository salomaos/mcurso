<script lang="ts">
	import TextoMatematico from './TextoMatematico.svelte';
	import { ehMultiplaEscolha } from '$lib/blocks';
	import type { CorrecaoQuestao, QuestaoPublica } from '$lib/conteudo';

	// A questão pública nunca recebe `correta`/`explicacao`: o gabarito fica no
	// servidor e a correção volta só depois do POST.
	type Props = {
		questao: QuestaoPublica;
		numero: number;
		/** Preenchido só no resultado, para marcar gabarito e resposta dada. */
		resultado?: CorrecaoQuestao;
	};

	let { questao, numero, resultado }: Props = $props();

	const multipla = $derived(ehMultiplaEscolha(questao));

	function letra(indice: number) {
		return String.fromCharCode(65 + indice);
	}

	function letras(lista: number[]) {
		return lista.map(letra).join(', ');
	}
</script>

<fieldset class="card card-bordered p-4 space-y-3 quebra-pagina" disabled={resultado !== undefined}>
	<legend class="text-xs font-semibold uppercase opacity-60 px-1">
		Questão {numero}
		{#if multipla}(várias respostas){/if}
	</legend>

	<p class="font-semibold"><TextoMatematico texto={questao.pergunta} /></p>

	<div class="space-y-2">
		{#each questao.alternativas as alternativa, indice (indice)}
			{@const marcada = resultado !== undefined && resultado.correta.includes(indice)}
			{@const escolhida = resultado !== undefined && resultado.escolhida.includes(indice)}
			<label
				class="btn btn-sm btn-block h-auto min-h-10 justify-start gap-2 whitespace-normal text-left"
				class:btn-primary={!resultado}
				class:btn-ghost={!resultado}
				class:btn-success={resultado !== undefined && marcada}
				class:btn-error={resultado !== undefined && escolhida && !marcada}
				class:btn-outline={resultado !== undefined && !marcada && !escolhida}
			>
				<input
					class={multipla ? 'checkbox checkbox-sm' : 'radio radio-sm'}
					type={multipla ? 'checkbox' : 'radio'}
					name={`q_${questao.id}`}
					value={indice}
					aria-label={`Alternativa ${letra(indice)}`}
					checked={resultado ? escolhida : undefined}
				/>
				<span class="text-xs opacity-60 font-bold">{letra(indice)})</span>
				<span><TextoMatematico texto={alternativa} /></span>
				{#if resultado !== undefined}
					<span class="ml-auto flex shrink-0 gap-1 text-xs font-semibold uppercase">
						{#if marcada}<span class="badge badge-sm badge-success">gabarito</span>{/if}
						{#if escolhida}
							<span class="badge badge-sm {marcada ? 'badge-success' : 'badge-error'}">
								selecionada
							</span>
						{/if}
					</span>
				{/if}
			</label>
		{/each}
	</div>

	{#if resultado}
		<div
			class="alert {resultado.acertou ? 'alert-success' : 'alert-error'} text-sm"
			role="status"
		>
			{resultado.acertou
				? 'Correto!'
				: resultado.escolhida.length === 0
					? `Sem resposta — gabarito: ${letras(resultado.correta)}`
					: `Incorreto — resposta certa: ${letras(resultado.correta)}`}
		</div>
		{#if resultado.explicacao}
			<p class="text-sm opacity-80 whitespace-pre-wrap">
				<TextoMatematico texto={resultado.explicacao} />
			</p>
		{/if}
	{/if}
</fieldset>
