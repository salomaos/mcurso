<script lang="ts">
	import EditorCanvas from './EditorCanvas.svelte';
	import TextoEditavel from './TextoEditavel.svelte';
	import BarraAcoes from './ui/BarraAcoes.svelte';
	import CabecalhoPagina from './ui/CabecalhoPagina.svelte';
	import Campo from './ui/Campo.svelte';
	import Pagina from './ui/Pagina.svelte';
	import { blocosPendentes } from '$lib/blocos-pendentes';
	import { enviando } from '$lib/enviando';
	import { EXEMPLO_AULA, interpretarImportacaoAula, resumoImportacaoAula } from '$lib/importar';
	import { exportarAulaLocal, resolverLinksAula } from '$lib/importar-aula';
	import type { Snippet } from 'svelte';
	import type { Blocos, SecaoUi } from '$lib/blocks';
	import { LIMITE_NOME_SECAO, mesmoNomeSecao } from '$lib/blocks';
	import { ROTULO_EDITAR, ROTULO_TIPO, ROTULO_VISUALIZAR, rotasConteudo, type AlvoLink, type ContextoConteudo } from '$lib/conteudo';

	type Conteudo = {
		id: number;
		titulo: string;
		descricao: string | null;
		blocos: Blocos;
		secaoId: number | null;
	};

	type Props = {
		conteudo: Conteudo;
		contexto: ContextoConteudo;
		secoes: SecaoUi[];
		alvos: { aulas: AlvoLink[]; anexos: AlvoLink[]; exercicios: AlvoLink[] };
		novo: boolean;
		erro?: string | null;
		baseHref?: string;
		/** Bloco extra no fim da página, já dentro da largura do editor. */
		rodape?: Snippet;
	};

	let {
		conteudo,
		contexto,
		secoes,
		alvos,
		novo,
		erro = null,
		baseHref = '/apostilas',
		rodape
	}: Props = $props();

	let modo = $state<'editar' | 'visualizar'>('editar');
	const rotulo = $derived(ROTULO_TIPO[contexto.tipo]);
	const { proprio, voltar, apostilaId } = $derived(rotasConteudo(contexto, conteudo.id, baseHref));
	const subtitulo = $derived(
		contexto.tipo === 'aula'
			? `Apostila "${contexto.apostilaTitulo}"`
			: contexto.tipo === 'anexo'
				? 'Material de apoio solto'
				: 'Atividade de exercícios solta'
	);
	// "da aula" / "do anexo" / "da atividade": monta os rótulos dos campos.
	const artigo = $derived(
		contexto.tipo === 'aula' ? 'da aula' : contexto.tipo === 'anexo' ? 'do anexo' : 'da atividade'
	);
	const rotuloTitulo = $derived(`Título ${artigo}`);
	const rotuloDescricao = $derived(`Descrição ${artigo}`);
	const aulaContexto = $derived(contexto.tipo === 'aula' ? conteudo.id : undefined);

	function valorInicial() {
		return {
			titulo: conteudo.titulo,
			descricao: conteudo.descricao ?? '',
			secaoId: conteudo.secaoId,
			blocos: conteudo.blocos
		};
	}

	let inicial = $state(valorInicial());
	let titulo = $state(inicial.titulo);
	let descricao = $state(inicial.descricao);
	let secaoId = $state(inicial.secaoId);
	let novaSecao = $state('');
	let criandoSecao = $state(false);
	let blocos = $state<Blocos>(inicial.blocos);

	// Blocos tecnicamente válidos mas sem cumprir o papel (vazios/sem alvo):
	// aviso só para o professor, e o aluno nunca vê (o aviso some em leitura).
	const pendentes = $derived(blocosPendentes(blocos));

	const nomeSecaoAtual = $derived(
		novaSecao.trim()
			? `${novaSecao.trim()} (nova)`
			: (secoes.find((secao) => secao.id === secaoId)?.nome ?? '')
	);

	function confirmarNovaSecao() {
		const nome = novaSecao.trim();
		if (!nome) return;
		const iguais = secoes.filter((secao) => mesmoNomeSecao(secao.nome, nome));
		criandoSecao = false;
		if (iguais.length > 0) {
			novaSecao = '';
			secaoId = iguais[0].id;
		} else secaoId = null;
	}

	function cancelarNovaSecao() {
		novaSecao = '';
		criandoSecao = false;
	}

	function atualizarBlocos(novos: Blocos) {
		blocos = novos;
	}

	// --- Importar/exportar por JSON (só aula) ----------------------------------
	// Colar um JSON de aula substitui o título, a descrição e todos os blocos
	// da aula aberta (com confirmação); a gravação continua sendo o "Salvar" do
	// form, que revalida tudo no servidor.
	let jsonAula = $state('');
	let aulaImportada = $state(false);

	const parseAula = $derived(jsonAula.trim() === '' ? null : interpretarImportacaoAula(jsonAula));
	const dadosAula = $derived(parseAula && 'dados' in parseAula ? parseAula.dados : null);
	const erroAula = $derived(parseAula && 'erro' in parseAula ? parseAula.erro : null);
	const resumoAula = $derived(dadosAula ? resumoImportacaoAula(dadosAula) : null);
	const resolucaoAula = $derived(dadosAula ? resolverLinksAula(dadosAula.blocos, alvos) : null);
	const erroResolucaoAula = $derived(
		resolucaoAula && 'erro' in resolucaoAula ? resolucaoAula.erro : null
	);
	const prontoParaImportar = $derived(
		dadosAula !== null && resolucaoAula !== null && 'blocos' in resolucaoAula
	);

	function exportarAulaAtual() {
		jsonAula = exportarAulaLocal(titulo, descricao, blocos, alvos);
		aulaImportada = false;
	}

	function importarAula() {
		if (!dadosAula || !resolucaoAula || 'erro' in resolucaoAula) return;
		if (
			!confirm(
				'Importar substitui o título, a descrição e todos os blocos atuais desta aula. Continuar?'
			)
		) {
			return;
		}
		titulo = dadosAula.titulo;
		descricao = dadosAula.descricao;
		blocos = resolucaoAula.blocos;
		aulaImportada = true;
	}

	// Popup do exemplo completo, no mesmo padrão do /importar: copiar para a IA
	// ou "Usar no editor" para jogar o JSON no textarea (a importação em si é o
	// "Importar e substituir" de cima, com confirmação).
	let exemploAberto = $state(false);
	let copiado = $state(false);

	function abrirExemplo() {
		copiado = false;
		exemploAberto = true;
	}

	function fecharExemplo() {
		exemploAberto = false;
		copiado = false;
	}

	function usarExemplo() {
		jsonAula = EXEMPLO_AULA;
		aulaImportada = false;
		fecharExemplo();
	}

	async function copiarExemplo() {
		try {
			await navigator.clipboard.writeText(EXEMPLO_AULA);
		} catch {
			// Fallback para contexto sem Clipboard API (ou permissão negada).
			const area = document.createElement('textarea');
			area.value = EXEMPLO_AULA;
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
</script>

<svelte:head>
	<title>Editar {rotulo.toLowerCase()} #{conteudo.id} — {voltar.rotulo}</title>
</svelte:head>

<Pagina largura="amplo" espaco={4}>
	<BarraAcoes
		voltar={{ href: proprio, rotulo: `Voltar para ${rotulo.toLowerCase()}` }}
		acoesClass="flex flex-wrap items-center gap-3"
	>
		<span class="text-sm opacity-60">
			{rotulo} #{conteudo.id} · {subtitulo}
		</span>
		<div class="join" role="group" aria-label="Modo do editor">
			<button
				class:btn-primary={modo === 'editar'}
				class="btn btn-sm"
				type="button"
				aria-pressed={modo === 'editar'}
				onclick={() => (modo = 'editar')}
			>
				{ROTULO_EDITAR}
			</button>
			<button
				class:btn-primary={modo === 'visualizar'}
				class="btn btn-sm"
				type="button"
				aria-pressed={modo === 'visualizar'}
				onclick={() => (modo = 'visualizar')}
			>
				{ROTULO_VISUALIZAR}
			</button>
		</div>
	</BarraAcoes>

	{#if erro}
		<div class="alert alert-error">{erro}</div>
	{/if}

	{#if modo === 'editar' && pendentes.length > 0}
		<div class="alert alert-warning py-2 text-sm">
			<ul class="list-disc ml-4 space-y-1">
				{#each pendentes as pendencia, i (i)}
					<li>
						Bloco {pendencia.indice} ({pendencia.rotulo}): {pendencia.motivo}
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<form method="POST" action="?/salvar" class="space-y-4" use:enviando>
		<header class="card card-bordered p-4 space-y-2">
			{#if modo === 'editar'}
				<p class="text-sm opacity-60">
					{#if contexto.tipo === 'aula'}
						Edite o título, a seção e a descrição direto no conteúdo, e os blocos no quadro abaixo.
					{:else}
						Edite o título e a descrição e monte os blocos no quadro abaixo.
					{/if}
				</p>

				{#if contexto.tipo === 'aula'}
					<div class="flex flex-wrap items-end gap-2">
						{#if criandoSecao}
							<!-- svelte-ignore a11y_autofocus -->
							<input
								class="input input-sm input-bordered w-56"
								type="text"
								bind:value={novaSecao}
								maxlength={LIMITE_NOME_SECAO}
								placeholder="Nome da nova seção"
								aria-label="Nome da nova seção"
								autofocus
								onkeydown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault();
										confirmarNovaSecao();
									}
									if (event.key === 'Escape') cancelarNovaSecao();
								}}
							/>
							<button
								class="btn btn-primary btn-sm"
								type="button"
								disabled={!novaSecao.trim()}
								onclick={confirmarNovaSecao}
							>
								Usar seção
							</button>
							<button class="btn btn-ghost btn-sm" type="button" onclick={cancelarNovaSecao}>
								Cancelar
							</button>
						{:else}
							<Campo rotulo="Seção" id="secao-aula" class="w-auto">
								<select
									id="secao-aula"
									class="select select-sm select-bordered w-56"
									aria-label="Seção da aula"
									bind:value={secaoId}
									onchange={() => {
										novaSecao = '';
									}}
								>
									<option value={null}>Sem seção</option>
									{#each secoes as secao (secao.id)}
										<option value={secao.id}>{secao.nome}</option>
									{/each}
								</select>
							</Campo>
							<button
								class="btn btn-ghost btn-sm"
								type="button"
								title="Criar uma nova seção"
								onclick={() => (criandoSecao = true)}
							>
								+ Nova seção
							</button>
							{#if secoes.length === 0}
								<span class="text-xs opacity-60">
									Crie as seções na página da apostila para organizar as aulas.
								</span>
							{/if}
						{/if}
					</div>
				{/if}

				<TextoEditavel
					texto={titulo}
					tipo="titulo"
					nivel={1}
					rotulo={rotuloTitulo}
					marcador={rotuloTitulo}
					focarAoMontar={novo}
					aoDigitar={(valor) => (titulo = valor)}
				/>

				<div class="opacity-80">
					<TextoEditavel
						texto={descricao}
						tipo="texto"
						rotulo={rotuloDescricao}
						marcador="Descrição"
						aoDigitar={(valor) => (descricao = valor)}
					/>
				</div>
{:else}
			<CabecalhoPagina {titulo} subtitulo={descricao} etiqueta={nomeSecaoAtual} />
		{/if}
		</header>

		<input type="hidden" name="titulo" value={titulo} />
		<input type="hidden" name="secaoId" value={secaoId ?? ''} />
		<input type="hidden" name="secaoNome" value={novaSecao.trim()} />
		<input type="hidden" name="descricao" value={descricao} />

		<EditorCanvas
	{blocos}
	atualizar={atualizarBlocos}
	{apostilaId}
	{modo}
	{alvos}
	rotulo={rotulo.toLowerCase()}
	{aulaContexto}
/>

		<input type="hidden" name="blocos" value={JSON.stringify(blocos)} />

		<div class="flex flex-wrap items-center gap-2">
			{#if modo === 'editar'}
				<button class="btn btn-primary" type="submit">Salvar {rotulo.toLowerCase()}</button>
			{:else}
				<button class="btn btn-outline" type="button" onclick={() => (modo = 'editar')}>
					Continuar editando
				</button>
			{/if}
			<a href={proprio} class="btn btn-ghost">Cancelar</a>
		</div>

		{#if contexto.tipo === 'aula' && modo === 'editar'}
			<details class="card card-bordered p-4">
				<summary class="cursor-pointer font-medium">Importar / exportar por JSON</summary>
				<div class="space-y-3 pt-3">
					<p class="text-sm opacity-70">
						"Exportar aula atual" joga o conteúdo da aula (mesmo formato do <a href="/importar" class="link">/importar</a>,
						ver <code>DOCS/importacao-ia.md</code>) para o JSON abaixo, pronto para ajustar pela IA. Importar
						substitui o título, a descrição e todos os blocos da aula — a gravação acontece no "Salvar aula".
					</p>
					<Campo rotulo="JSON da aula" id="json-aula">
						<textarea
							id="json-aula"
							bind:value={jsonAula}
							oninput={() => (aulaImportada = false)}
							class="textarea textarea-bordered w-full font-mono text-xs"
							rows={10}
						></textarea>
					</Campo>

					<div class="flex flex-wrap items-center gap-2">
						<button class="btn btn-outline btn-sm" type="button" onclick={abrirExemplo}>
							Exemplo completo
						</button>
						<button class="btn btn-outline btn-sm" type="button" onclick={exportarAulaAtual}>
							Exportar aula atual
						</button>
						<button
							class="btn btn-primary btn-sm"
							type="button"
							disabled={!prontoParaImportar}
							onclick={importarAula}
						>
							Importar e substituir
						</button>
					</div>

					{#if aulaImportada}
						<div class="alert alert-success py-2 text-sm">
							Aula substituída no editor. Clique em "Salvar aula" para gravar.
						</div>
					{/if}
					{#if erroAula}
						<div class="alert alert-warning py-2 text-sm">{erroAula}</div>
					{:else if erroResolucaoAula}
						<div class="alert alert-error py-2 text-sm">{erroResolucaoAula}</div>
					{:else if resumoAula}
						<p class="text-sm opacity-70">
							{resumoAula.blocos} bloco(s) — "{resumoAula.titulo}"
						</p>
						{#if resumoAula.desconhecidos > 0}
							<div class="alert alert-warning py-2 text-sm">
								{resumoAula.desconhecidos} bloco(s) com tipo desconhecido serão ignorados.
							</div>
						{/if}
						{#if resumoAula.pendencias.length > 0}
							<div class="alert alert-warning py-2 text-sm">
								<ul class="list-disc ml-4 space-y-1">
									{#each resumoAula.pendencias as pendencia, i (i)}
										<li>Bloco {pendencia.indice} ({pendencia.rotulo}): {pendencia.motivo}</li>
									{/each}
								</ul>
							</div>
						{/if}
					{/if}
				</div>
			</details>
		{/if}
	</form>

	{#if rodape}
		{@render rodape()}
	{/if}
</Pagina>

{#if exemploAberto}
	<div
		class="modal modal-open overflow-y-auto items-start"
		role="dialog"
		aria-modal="true"
		aria-label="Exemplo de aula"
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
				<span class="badge badge-primary">Aula</span>
				<h2 class="font-bold text-lg break-words">Exemplo de aula</h2>
			</header>
			<p class="text-sm opacity-80">
				Aula completa com os 12 tipos de bloco (título, texto, código, diagrama, imagem, link, tabela,
				fórmula, exercício, dissertativa, simulação e HTML). Copie para o prompt da IA ou use direto
				no editor.
			</p>
			<pre
				class="font-mono text-xs flex-1 min-h-0 overflow-auto rounded-box bg-base-200 p-3 my-3 border"
			>{EXEMPLO_AULA}</pre>
			<div class="modal-action flex-wrap">
				<button class="btn btn-ghost" type="button" onclick={fecharExemplo}>Fechar</button>
				<button class="btn btn-outline" type="button" onclick={copiarExemplo}>
					{copiado ? 'Copiado!' : 'Copiar'}
				</button>
				<button class="btn btn-primary" type="button" onclick={usarExemplo}>Usar no editor</button>
			</div>
		</div>
	</div>
{/if}
