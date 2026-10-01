<script lang="ts">
	import TextoEditavel from './TextoEditavel.svelte';
	import TextoMatematico from './TextoMatematico.svelte';
	import Alternativa from './Alternativa.svelte';
	import Campo from './ui/Campo.svelte';
	import {
		corretasDoExercicio,
		ehMultiplaEscolha,
		type Bloco,
		type BlocoExercicio
	} from '$lib/blocks';
	import { SELECOES_EXERCICIO, type SelecaoExercicio } from '$lib/conteudo';

	type Modo = 'editar' | 'visualizar';
	type Props = {
		bloco: BlocoExercicio;
		modo?: Modo;
		atualizar?: (transformar: (atual: Bloco) => Bloco) => void;
	};

	let { bloco, modo = 'visualizar', atualizar }: Props = $props();

	let selecionadas = $state<number[]>([]);
	let mostrado = $state(false);

	const editando = $derived(modo === 'editar');
	const multipla = $derived(ehMultiplaEscolha(bloco));
	const corretas = $derived(corretasDoExercicio(bloco));
	const acertou = $derived(
		selecionadas.length === corretas.length && selecionadas.every((indice, i) => indice === corretas[i])
	);

	$effect(() => {
		JSON.stringify([bloco.id, bloco.pergunta, bloco.alternativas, bloco.correta, bloco.explicacao]);
		selecionadas = [];
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

	// Trocar de modalidade leva o gabarito junto: uma resposta vira a lista com
	// aquela, e várias viram a primeira (o que a lista já tinha).
	function alterarSelecao(selecao: SelecaoExercicio) {
		mudar((atual) => {
			const atuais = corretasDoExercicio(atual);
			return {
				...atual,
				selecao,
				correta: selecao === 'radio' ? (atuais[0] ?? 0) : (atuais.length > 0 ? atuais : [0])
			};
		});
	}

	function marcarCorreta(indice: number) {
		mudar((atual) => {
			if (ehMultiplaEscolha(atual)) {
				const lista = new Set(corretasDoExercicio(atual));
				if (lista.has(indice)) lista.delete(indice);
				else lista.add(indice);
				const nova = [...lista].sort((a, b) => a - b);
				// Sem nenhuma marcada a questão não tem resposta certa.
				return { ...atual, correta: nova.length > 0 ? nova : [indice] };
			}
			return { ...atual, correta: indice };
		});
	}

	function adicionarAlternativa() {
		mudar((atual) => ({ ...atual, alternativas: [...atual.alternativas, ''] }));
	}

	// Remove a alternativa e remapeia o gabarito para os índices novos.
	function removerAlternativa(indice: number) {
		mudar((atual) => {
			if (atual.alternativas.length <= 2) return atual;
			const alternativas = [...atual.alternativas];
			alternativas.splice(indice, 1);
			const remapeadas = corretasDoExercicio(atual)
				.filter((atual) => atual !== indice)
				.map((atual) => (atual > indice ? atual - 1 : atual));
			const corretasNovas = remapeadas.length > 0 ? remapeadas : [0];
			return {
				...atual,
				alternativas,
				correta: ehMultiplaEscolha(atual) ? corretasNovas : (corretasNovas[0] ?? 0)
			};
		});
	}

	function alterarExplicacao(valor: string) {
		mudar((atual) => ({ ...atual, explicacao: valor || undefined }));
	}

	function letra(indice: number) {
		return String.fromCharCode(65 + indice);
	}

	function letrasDaGabarito() {
		return corretas.map(letra).join(', ');
	}

	function escolher(indice: number) {
		if (mostrado) return;
		if (!multipla) {
			selecionadas = [indice];
			mostrado = true;
			return;
		}
		selecionadas = selecionadas.includes(indice)
			? selecionadas.filter((atual) => atual !== indice)
			: [...selecionadas, indice].sort((a, b) => a - b);
	}

	function reiniciar() {
		selecionadas = [];
		mostrado = false;
	}
</script>

<fieldset class="card card-bordered p-4 space-y-3">
	<legend class="text-xs uppercase font-semibold opacity-60 px-1">
		{multipla ? 'Exercício (múltiplas escolhas)' : 'Exercício'}
	</legend>

	{#if editando}
		<div class="flex flex-wrap items-end gap-2">
			<Campo rotulo="Tipo de resposta" id={`selecao-${bloco.id}`} class="w-auto">
				<select
					id={`selecao-${bloco.id}`}
					class="select select-xs select-bordered"
					value={bloco.selecao ?? 'radio'}
					onchange={(event) => alterarSelecao(event.currentTarget.value as SelecaoExercicio)}
				>
					{#each SELECOES_EXERCICIO as selecao}
						<option value={selecao}>
							{selecao === 'radio' ? 'Uma alternativa (rádio)' : 'Várias alternativas (caixas)'}
						</option>
					{/each}
				</select>
			</Campo>
			<span class="text-xs opacity-60">
				{multipla
					? 'Marque todas as alternativas verdadeiras.'
					: 'Marque a única alternativa verdadeira.'}
			</span>
		</div>

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
						class={multipla ? 'checkbox checkbox-sm' : 'radio radio-sm'}
						type={multipla ? 'checkbox' : 'radio'}
						name={`correta-${bloco.id}`}
						checked={corretas.includes(indice)}
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

		<p class="text-xs opacity-60">
			Fórmula entre <code>$</code>: <code>alternativa $\frac{1}{2}$</code>.
		</p>

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
		<p class="font-semibold"><TextoMatematico texto={bloco.pergunta} /></p>

		<div class="space-y-2">
			{#each bloco.alternativas as alternativa, indice}
				<Alternativa
					letra={letra(indice)}
					texto={alternativa}
					tipo={bloco.selecao ?? 'radio'}
					name={`inline-${bloco.id}`}
					value={indice}
					resultado={mostrado}
					marcada={corretas.includes(indice)}
					escolhida={selecionadas.includes(indice)}
					checked={selecionadas.includes(indice)}
					desabilitada={mostrado}
					aoEscolher={(indice) => escolher(indice)}
				/>
			{/each}
		</div>

		{#if multipla && !mostrado}
			<button
				type="button"
				class="btn btn-sm"
				disabled={selecionadas.length === 0}
				onclick={() => (mostrado = true)}
			>
				Confirmar resposta
			</button>
		{/if}

		{#if mostrado}
			<div class="alert {acertou ? 'alert-success' : 'alert-error'} text-sm" role="status">
				{acertou ? 'Correto!' : `Incorreto — resposta certa: ${letrasDaGabarito()}`}
			</div>
			{#if bloco.explicacao}
				<div class="text-sm opacity-80 whitespace-pre-wrap">
					<TextoMatematico texto={bloco.explicacao} />
				</div>
			{/if}
			<button type="button" class="btn btn-ghost btn-xs" onclick={reiniciar}>
				Tentar novamente
			</button>
		{/if}
	{/if}
</fieldset>
