<script lang="ts">
	import { onMount } from 'svelte';
	import BarraAcoes from './ui/BarraAcoes.svelte';
	import Campo from './ui/Campo.svelte';
	import Pagina from './ui/Pagina.svelte';
	import {
		criarPergunta,
		EXEMPLO_IMPORTACAO,
		interpretarQuizImportado,
		LIMITE_ALTERNATIVA,
		LIMITE_PERGUNTA,
		LIMITE_TITULO,
		MAX_ALTERNATIVAS,
		MIN_ALTERNATIVAS,
		TEMPO_MAX,
		TEMPO_MIN,
		type PerguntaQuiz,
		type Quiz
	} from '$lib/quiz';

	type Props = {
		quiz: Quiz;
		novo: boolean;
		erro?: string | null;
	};

	let { quiz, novo, erro = null }: Props = $props();

	let tituloEl = $state<HTMLInputElement>();

	// Cópia inicial: o editor mexe nas alternativas, não queremos tocar no objeto
	// vindo do load. A função isola a leitura da prop (mesmo padrão do
	// `EditorConteudo`) e evita o aviso de "referência só captura o valor inicial".
	function valorInicial() {
		return {
			titulo: quiz.titulo,
			descricao: quiz.descricao ?? '',
			perguntas: quiz.perguntas.map((pergunta) => ({
				...pergunta,
				alternativas: [...pergunta.alternativas]
			}))
		};
	}

	let inicial = $state(valorInicial());
	let titulo = $state(inicial.titulo);
	let descricao = $state(inicial.descricao);
	let perguntas = $state<PerguntaQuiz[]>(inicial.perguntas);

	let importTexto = $state('');
	let importErro = $state<string | null>(null);
	let importAviso = $state<string | null>(null);

	const total = $derived(perguntas.length);

	onMount(() => {
		if (novo) tituloEl?.focus();
	});

	function adicionarPergunta() {
		perguntas = [...perguntas, criarPergunta()];
	}

	function removerPergunta(indice: number) {
		perguntas = perguntas.filter((_, posicao) => posicao !== indice);
	}

	function moverPergunta(indice: number, delta: number) {
		const destino = indice + delta;
		if (destino < 0 || destino >= perguntas.length) return;
		const copia = [...perguntas];
		[copia[indice], copia[destino]] = [copia[destino], copia[indice]];
		perguntas = copia;
	}

	function adicionarAlternativa(pergunta: PerguntaQuiz) {
		if (pergunta.alternativas.length >= MAX_ALTERNATIVAS) return;
		pergunta.alternativas = [...pergunta.alternativas, ''];
	}

	function removerAlternativa(pergunta: PerguntaQuiz, indice: number) {
		if (pergunta.alternativas.length <= MIN_ALTERNATIVAS) return;
		pergunta.alternativas = pergunta.alternativas.filter((_, posicao) => posicao !== indice);
		if (pergunta.correta >= pergunta.alternativas.length) {
			pergunta.correta = pergunta.alternativas.length - 1;
		}
	}

	function importar() {
		importErro = null;
		importAviso = null;

		const resultado = interpretarQuizImportado(importTexto);
		if ('erro' in resultado) {
			importErro = resultado.erro;
			return;
		}

		if (resultado.titulo) titulo = resultado.titulo;
		if (resultado.descricao) descricao = resultado.descricao;
		perguntas = resultado.perguntas;
		importAviso = `${resultado.perguntas.length} ${resultado.perguntas.length === 1 ? 'pergunta importada' : 'perguntas importadas'}. Confira e salve.`;
		importTexto = '';
	}

	// Joga o quiz atual no textarea, no mesmo formato que o `importar` entende,
	// para dar uma volta de copiar/colar (guardar, reusar em outro quiz, pedir
	// revisão à IA). Sem `id`: o parser gera ids novos de qualquer jeito.
	function exportar() {
		importErro = null;
		importAviso = null;

		importTexto = JSON.stringify(
			{
				titulo,
				descricao,
				perguntas: perguntas.map(({ pergunta, alternativas, correta, tempo }) => ({
					pergunta,
					alternativas,
					correta,
					tempo
				}))
			},
			null,
			2
		);
		importAviso = 'Quiz atual no JSON abaixo. Edite e clique em "Importar perguntas" para aplicar.';
	}
</script>

<Pagina largura="amplo" espaco={4}>
	<BarraAcoes voltar={{ href: '/quiz', rotulo: 'Quiz' }}>
		<span class="text-xs opacity-60">Quiz #{quiz.id}</span>
	</BarraAcoes>

	{#if erro}
		<div class="alert alert-error" role="alert">{erro}</div>
	{/if}

	<form method="POST" action="?/salvar" class="space-y-4">
		<header class="card card-bordered p-4 space-y-3">
			<p class="text-sm opacity-60">
				Monte as perguntas abaixo ou cole um JSON pronto (a estrutura que a IA costuma devolver) e o
				editor gera o quiz.
			</p>
			<Campo rotulo="Título do quiz" id="quiz-titulo">
				<input
					id="quiz-titulo"
					class="input input-bordered w-full"
					type="text"
					bind:value={titulo}
					bind:this={tituloEl}
					maxlength={LIMITE_TITULO}
					required
					placeholder="Ex.: Revisão de frações"
				/>
			</Campo>
			<Campo rotulo="Descrição" id="quiz-descricao" dica="opcional">
				<textarea
					id="quiz-descricao"
					class="textarea textarea-bordered w-full"
					bind:value={descricao}
					rows="2"
					maxlength="600"
					placeholder="Uma linha explicando o tema do quiz"
				></textarea>
			</Campo>
		</header>

		<input type="hidden" name="titulo" value={titulo} />
		<input type="hidden" name="descricao" value={descricao} />
		<input type="hidden" name="perguntas" value={JSON.stringify(perguntas)} />

		{#if total === 0}
			<div class="alert alert-info">
				Nenhuma pergunta ainda. Adicione abaixo ou importe um JSON.
			</div>
		{/if}

		<div class="space-y-3">
			{#each perguntas as pergunta, indice (pergunta.id)}
				<article class="card card-bordered p-4 space-y-3">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<span class="badge badge-outline">Pergunta {indice + 1}</span>
						<div class="flex items-center gap-1">
							<button
								class="btn btn-ghost btn-xs"
								type="button"
								disabled={indice === 0}
								title="Subir"
								aria-label={`Subir pergunta ${indice + 1}`}
								onclick={() => moverPergunta(indice, -1)}
							>
								↑
							</button>
							<button
								class="btn btn-ghost btn-xs"
								type="button"
								disabled={indice === perguntas.length - 1}
								title="Descer"
								aria-label={`Descer pergunta ${indice + 1}`}
								onclick={() => moverPergunta(indice, 1)}
							>
								↓
							</button>
							<button
								class="btn btn-ghost btn-xs"
								type="button"
								title="Remover pergunta"
								aria-label={`Remover pergunta ${indice + 1}`}
								onclick={() => removerPergunta(indice)}
							>
								Excluir
							</button>
						</div>
					</div>

					<Campo rotulo="Enunciado" id={`pergunta-${pergunta.id}`}>
						<textarea
							id={`pergunta-${pergunta.id}`}
							class="textarea textarea-bordered w-full"
							bind:value={pergunta.pergunta}
							rows="2"
							maxlength={LIMITE_PERGUNTA}
							placeholder="Escreva a pergunta"
						></textarea>
					</Campo>

					<fieldset class="space-y-2 p-4">
						<legend class="label-text pb-1">Alternativas (marque a correta)</legend>
						{#each pergunta.alternativas as _, alternativaIndice (alternativaIndice)}
							<div class="flex items-center gap-2">
								<input
									class="radio radio-primary"
									type="radio"
									name={`correta-${pergunta.id}`}
									checked={pergunta.correta === alternativaIndice}
									onchange={() => (pergunta.correta = alternativaIndice)}
									aria-label={`Marcar alternativa ${alternativaIndice + 1} como correta`}
								/>
								<input
									class="input input-sm input-bordered flex-1"
									type="text"
									bind:value={pergunta.alternativas[alternativaIndice]}
									maxlength={LIMITE_ALTERNATIVA}
									placeholder={`Alternativa ${alternativaIndice + 1}`}
									aria-label={`Alternativa ${alternativaIndice + 1}`}
								/>
								<button
									class="btn btn-ghost btn-xs"
									type="button"
									disabled={pergunta.alternativas.length <= MIN_ALTERNATIVAS}
									title="Remover alternativa"
									aria-label={`Remover alternativa ${alternativaIndice + 1}`}
									onclick={() => removerAlternativa(pergunta, alternativaIndice)}
								>
									×
								</button>
							</div>
						{/each}
						<button
							class="btn btn-ghost btn-xs"
							type="button"
							disabled={pergunta.alternativas.length >= MAX_ALTERNATIVAS}
							onclick={() => adicionarAlternativa(pergunta)}
						>
							+ Alternativa
						</button>
					</fieldset>

					<div class="w-40">
						<Campo rotulo="Tempo (segundos)" id={`tempo-${pergunta.id}`}>
							<input
								id={`tempo-${pergunta.id}`}
								class="input input-sm input-bordered w-full"
								type="number"
								bind:value={pergunta.tempo}
								min={TEMPO_MIN}
								max={TEMPO_MAX}
							/>
						</Campo>
					</div>
				</article>
			{/each}
		</div>

		<button class="btn btn-outline" type="button" onclick={adicionarPergunta}>+ Adicionar pergunta</button>

		<details class="card card-bordered p-4">
			<summary class="cursor-pointer font-medium">Colar um JSON pronto</summary>
			<div class="space-y-3 pt-3">
				<p class="text-sm opacity-70">
					Cole uma lista de perguntas ou um objeto com o campo <code>perguntas</code>. Ao importar, as
					perguntas atuais são substituídas. Campos aceitos: <code>pergunta</code>,
					<code>alternativas</code>, <code>correta</code> (índice ou texto) e <code>tempo</code>.
				</p>
				<textarea
					class="textarea textarea-bordered w-full font-mono text-xs"
					rows="8"
					bind:value={importTexto}
					aria-label="JSON do quiz"
					placeholder={EXEMPLO_IMPORTACAO}
				></textarea>
				{#if importErro}
					<div class="alert alert-error" role="alert">{importErro}</div>
				{/if}
				{#if importAviso}
					<div class="alert alert-success" role="status">{importAviso}</div>
				{/if}
				<div class="flex flex-wrap items-center gap-2">
					<button
						class="btn btn-primary btn-sm"
						type="button"
						disabled={!importTexto.trim()}
						onclick={importar}
					>
						Importar perguntas
					</button>
					<button class="btn btn-outline btn-sm" type="button" onclick={exportar}>
						Exportar perguntas
					</button>
					<details>
						<summary class="btn btn-ghost btn-sm">Ver exemplo</summary>
						<pre class="mt-2 overflow-x-auto rounded-box bg-base-200 p-3 text-xs">{EXEMPLO_IMPORTACAO}</pre>
					</details>
				</div>
			</div>
		</details>

		<div class="flex flex-wrap items-center gap-2">
			<button class="btn btn-primary" type="submit">Salvar quiz</button>
			<a href="/quiz" class="btn btn-ghost">Cancelar</a>
		</div>
	</form>
</Pagina>
