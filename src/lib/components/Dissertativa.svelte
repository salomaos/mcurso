<script lang="ts">
	import TextoEditavel from './TextoEditavel.svelte';
	import TextoMatematico from './TextoMatematico.svelte';
	import { LIMITE_DISSERTATIVA } from '$lib/corrigir';
	import type { Bloco, BlocoDissertativa } from '$lib/blocks';

	type Modo = 'editar' | 'visualizar';
	type Props = {
		bloco: BlocoDissertativa;
		modo?: Modo;
		atualizar?: (transformar: (atual: Bloco) => Bloco) => void;
		/**
		 * Nome do campo no formulário. Só na página pública da atividade: aí a
		 * resposta viaja no POST e volta no resultado.
		 */
		campo?: string;
		/** Resposta do aluno, já corrigida: mostra em campo somente leitura. */
		resposta?: string;
	};

	let { bloco, modo = 'visualizar', atualizar, campo, resposta }: Props = $props();

	// Rascunho dentro de aula/anexo: fica só na memória da página, não é salvo.
	let rascunho = $state('');

	const editando = $derived(modo === 'editar');
	const mostrarResposta = $derived(resposta !== undefined);

	function mudar(transformar: (atual: BlocoDissertativa) => BlocoDissertativa) {
		atualizar?.((atual) =>
			atual.tipo === 'dissertativa' ? (transformar(atual) as Bloco) : atual
		);
	}

	function alterarPergunta(valor: string) {
		mudar((atual) => ({ ...atual, pergunta: valor }));
	}

	function alterarOrientacao(valor: string) {
		mudar((atual) => ({ ...atual, orientacao: valor || undefined }));
	}

	const rotulo = $derived(
		bloco.orientacao ??
			'Explique o raciocínio. A resposta aparece no resultado para avaliação.'
	);
</script>

<fieldset class="card card-bordered p-4 space-y-3 quebra-pagina">
	<legend class="text-xs uppercase font-semibold opacity-60 px-1">Dissertativa</legend>

	{#if editando}
		<div class="font-semibold">
			<TextoEditavel
				texto={bloco.pergunta}
				tipo="texto"
				rotulo="Pergunta da atividade"
				marcador="Pergunta (o aluno responde por escrito)"
				aoDigitar={alterarPergunta}
			/>
		</div>

		<div class="space-y-1 border-t border-base-300 pt-2">
			<span class="text-xs font-semibold uppercase tracking-wide opacity-60">Orientação</span>
			<TextoEditavel
				texto={bloco.orientacao ?? ''}
				tipo="texto"
				rotulo="Orientação"
				marcador="O que esperar na resposta (opcional)"
				aoDigitar={alterarOrientacao}
			/>
		</div>
	{:else}
		<p class="font-semibold"><TextoMatematico texto={bloco.pergunta} /></p>
		<p class="text-sm opacity-70"><TextoMatematico texto={rotulo} /></p>

		{#if mostrarResposta}
			<textarea
				class="textarea textarea-bordered w-full leading-relaxed"
				rows="6"
				readonly
				aria-readonly="true"
				aria-label="Resposta do aluno"
				>{resposta}</textarea
			>
		{:else}
			<textarea
				class="textarea textarea-bordered w-full leading-relaxed"
				rows="5"
				name={campo}
				maxlength={LIMITE_DISSERTATIVA}
				bind:value={rascunho}
				placeholder={campo ? 'Escreva sua resposta' : 'Rascunho: não é salvo'}
				aria-label={campo ? 'Sua resposta' : 'Rascunho'}
			></textarea>
			{#if !campo}
				<p class="text-xs opacity-60">
					Rascunho: fora de uma atividade de exercícios a resposta não é guardada.
				</p>
			{/if}
		{/if}
	{/if}
</fieldset>
