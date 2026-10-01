<script lang="ts">
	import EditorCanvas from './EditorCanvas.svelte';
	import TextoEditavel from './TextoEditavel.svelte';
	import BarraAcoes from './ui/BarraAcoes.svelte';
	import Campo from './ui/Campo.svelte';
	import Pagina from './ui/Pagina.svelte';
	import type { Snippet } from 'svelte';
	import type { Blocos, SecaoUi } from '$lib/blocks';
	import { mesmoNomeSecao } from '$lib/blocks';
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

	<form method="POST" action="?/salvar" class="space-y-4">
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
					<div class="flex flex-wrap items-center gap-2">
						{#if criandoSecao}
							<!-- svelte-ignore a11y_autofocus -->
							<input
								class="input input-sm input-bordered w-56"
								type="text"
								bind:value={novaSecao}
								maxlength="60"
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
				{#if nomeSecaoAtual}
					<span class="badge badge-outline">{nomeSecaoAtual}</span>
				{/if}
				<h1 class="text-3xl font-bold">{titulo}</h1>
				{#if descricao}
					<p class="opacity-80">{descricao}</p>
				{/if}
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
	</form>

	{#if rodape}
		{@render rodape()}
	{/if}
</Pagina>
