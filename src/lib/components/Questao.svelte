<script lang="ts">
	import Alternativa from './Alternativa.svelte';
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
			<Alternativa
				letra={letra(indice)}
				texto={alternativa}
				tipo={questao.selecao}
				name={`q_${questao.id}`}
				value={indice}
				resultado={resultado !== undefined}
				marcada={resultado !== undefined && resultado.correta.includes(indice)}
				escolhida={resultado !== undefined && resultado.escolhida.includes(indice)}
				checked={resultado ? resultado.escolhida.includes(indice) : undefined}
			/>
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
