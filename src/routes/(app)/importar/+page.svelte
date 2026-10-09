<script lang="ts">
	import Campo from '$lib/components/ui/Campo.svelte';
	import CabecalhoPagina from '$lib/components/ui/CabecalhoPagina.svelte';
	import Pagina from '$lib/components/ui/Pagina.svelte';
	import { enviando } from '$lib/enviando';
	import {
		EXEMPLO_APOSTILA,
		EXEMPLOS_IMPORTACAO,
		LIMITES_IMPORTACAO,
		interpretarImportacao,
		resumoImportacao
	} from '$lib/importar';
	import type { Importacao } from '$lib/importar';
	import type { ActionData, PageData } from './$types';

	let { form, data } = $props<{ form: ActionData; data: PageData }>();

	let json = $state(EXEMPLO_APOSTILA);

	const resultado = $derived(interpretarImportacao(json));
	const erro = $derived('erro' in resultado ? resultado.erro : null);
	const resumo = $derived('dados' in resultado ? resumoImportacao(resultado.dados) : null);

	function carregarExemplo() {
		json = EXEMPLO_APOSTILA;
	}

	// --- Exemplos por tipo (popup) ------------------------------------------
	let exemploAberto = $state<Importacao['conteudo'] | null>(null);
	const exemplo = $derived(EXEMPLOS_IMPORTACAO.find((e) => e.conteudo === exemploAberto) ?? null);
	let copiado = $state(false);

	function abrirExemplo(conteudo: Importacao['conteudo']) {
		copiado = false;
		exemploAberto = conteudo;
	}

	function fecharExemplo() {
		exemploAberto = null;
		copiado = false;
	}

	function usarExemplo() {
		if (!exemplo) return;
		json = exemplo.json;
		fecharExemplo();
	}

	async function copiarExemplo() {
		if (!exemplo) return;
		try {
			await navigator.clipboard.writeText(exemplo.json);
		} catch {
			// Fallback para contexto sem Clipboard API (ou permissão negada).
			const area = document.createElement('textarea');
			area.value = exemplo.json;
			area.style.position = 'fixed';
			area.style.opacity = '0';
			document.body.appendChild(area);
			area.select();
			document.execCommand('copy');
			area.remove();
		}
		copiado = true;
		setTimeout(() => (copiado = false), 1500);
	}

	// --- Exportação round-trip ----------------------------------------------
	let tipoExport = $state<'apostila' | 'anexo' | 'exercicio' | 'quiz'>('apostila');
	const opcoes = $derived(data.exportaveis[tipoExport]);
	let idExport = $state<string>('');

	const aoResultado = ({
		result
	}: {
		result: { type: string; data?: Record<string, unknown> };
	}) => {
		if (result.type === 'success' && typeof result.data?.json === 'string') {
			json = result.data.json;
		}
	};

	function aoTrocarTipo() {
		idExport = opcoes[0]?.id != null ? String(opcoes[0].id) : '';
	}
</script>

<svelte:head>
	<title>Importar por JSON — mcurso</title>
</svelte:head>

<Pagina largura="conteudo" espaco={4}>
	<CabecalhoPagina
		titulo="Importar por JSON"
		subtitulo="Crie apostila, anexo, atividade ou quiz colando um JSON gerado por IA. O formato está documentado em DOCS/importacao-ia.md."
	/>

	{#if form?.erro}
		<div class="alert alert-error">{form.erro}</div>
	{/if}

	<form method="POST" action="?/criar" use:enviando class="space-y-4">
		<Campo rotulo="JSON do conteúdo" id="json" dica={`Máx. ${LIMITES_IMPORTACAO.maxJsonBytes / 1024} KB`}>
			<textarea
				id="json"
				name="json"
				bind:value={json}
				class="textarea textarea-bordered w-full font-mono text-sm"
				rows={14}
			></textarea>
		</Campo>

		<div class="flex flex-wrap items-center gap-2">
			<button class="btn btn-primary" type="submit" disabled={!resumo}>Criar conteúdo</button>
			<button class="btn btn-ghost" type="button" onclick={carregarExemplo}>
				Carregar exemplo
			</button>
		</div>
	</form>

	<section class="card card-bordered p-4 space-y-2">
		<h2 class="font-bold">Ver exemplos completos</h2>
		<p class="text-sm opacity-70">
			Cada tipo de conteúdo tem um exemplo pronto, com todos os blocos que ele aceita. Abra, copie e
			cole no prompt da IA para ela gerar o seu JSON no mesmo formato.
		</p>
		<div class="flex flex-wrap items-center gap-2" role="group" aria-label="Ver exemplo por tipo">
			{#each EXEMPLOS_IMPORTACAO as ex}
				<button class="btn btn-outline btn-sm" type="button" onclick={() => abrirExemplo(ex.conteudo)}>
					Exemplo: {ex.rotulo}
				</button>
			{/each}
		</div>
	</section>

	{#if erro}
		<div class="alert alert-warning">{erro}</div>
	{:else if resumo}
		<section class="card card-bordered p-4 space-y-2">
			<header class="flex items-center gap-2">
				<span class="badge badge-primary">{resumo.rotuloTipo}</span>
				<h2 class="font-bold break-words">{resumo.titulo}</h2>
			</header>

			{#if resumo.descricao}
				<p class="text-sm opacity-80 whitespace-pre-wrap">{resumo.descricao}</p>
			{/if}

			<p class="text-sm opacity-70">
				{#if resumo.tipo === 'apostila'}
					{resumo.secoes} seção(ões) · {resumo.aulas} aula(s) · {resumo.blocos} bloco(s)
				{:else if resumo.tipo === 'quiz'}
					{resumo.perguntas} pergunta(s)
				{:else}
					{resumo.blocos} bloco(s)
				{/if}
			</p>

			{#if resumo.pendencias.length > 0}
				<div class="alert alert-warning py-2 text-sm">
					<ul class="list-disc ml-4 space-y-1">
						{#each resumo.pendencias as pendencia, i (i)}
							<li>Bloco {pendencia.indice} ({pendencia.rotulo}): {pendencia.motivo}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</section>
	{/if}

	<section class="card card-bordered p-4 space-y-2">
		<h2 class="font-bold">Exportar um conteúdo existente</h2>
		<p class="text-sm opacity-70">
			Pega o conteúdo atual de uma apostila/anexo/atividade/quiz e preenche o JSON de cima, pronto
			para guardar, ajustar ou reimportar.
		</p>

		<form
			method="POST"
			action="?/exportar"
			use:enviando={{ aoResultado }}
			class="flex flex-wrap items-end gap-2"
		>
			<Campo rotulo="Tipo" id="tipo-exportar">
				<select
					id="tipo-exportar"
					name="tipo"
					bind:value={tipoExport}
					onchange={aoTrocarTipo}
					class="select select-bordered"
				>
					<option value="apostila">Apostila</option>
					<option value="anexo">Anexo</option>
					<option value="exercicio">Atividade</option>
					<option value="quiz">Quiz</option>
				</select>
			</Campo>

			<Campo rotulo="Conteúdo" id="item-exportar">
				<select id="item-exportar" name="id" bind:value={idExport} class="select select-bordered w-full">
					{#if opcoes.length === 0}
						<option value="">— nada aqui ainda —</option>
					{:else}
						{#each opcoes as opcao}
							<option value={opcao.id}>{opcao.titulo}</option>
						{/each}
					{/if}
				</select>
			</Campo>

			<button class="btn btn-ghost" type="submit" disabled={!idExport}>
				Carregar no editor
			</button>
		</form>
	</section>
</Pagina>

{#if exemplo}
	<div
		class="modal modal-open overflow-y-auto items-start"
		role="dialog"
		aria-modal="true"
		aria-label={`Exemplo de ${exemplo.rotulo.toLowerCase()}`}
		tabindex="-1"
		onclick={(event) => {
			if (event.target === event.currentTarget) fecharExemplo();
		}}
		onkeydown={(event) => {
			if (event.key === 'Escape') fecharExemplo();
		}}
	>
		<div class="modal-box max-w-3xl max-h-screen flex flex-col">
			<header class="flex flex-wrap items-center gap-2">
				<span class="badge badge-primary">{exemplo.rotulo}</span>
				<h2 class="font-bold text-lg break-words">Exemplo de {exemplo.rotulo.toLowerCase()}</h2>
			</header>
			<p class="text-sm opacity-80">{exemplo.descricao}</p>
			<pre
				class="font-mono text-xs flex-1 min-h-0 overflow-auto rounded-box bg-base-200 p-3 my-3 border"
			>{exemplo.json}</pre>
			<div class="modal-action flex-wrap">
				<button class="btn btn-ghost" type="button" onclick={fecharExemplo}>Fechar</button>
				<button class="btn btn-outline" type="button" onclick={copiarExemplo}>
					{copiado ? 'Copiado!' : 'Copiar para a IA'}
				</button>
				<button class="btn btn-primary" type="button" onclick={usarExemplo}>Usar no editor</button>
			</div>
		</div>
	</div>
{/if}