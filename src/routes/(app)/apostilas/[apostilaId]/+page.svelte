<script lang="ts">
import { invalidateAll } from '$app/navigation';
	import { arrastar, moverItem } from '$lib/arrastar';
	import {
		agruparPorSecao,
		LIMITE_NOME_SECAO,
		type AulaUi,
		type SecaoUi
	} from '$lib/blocks';
	import TextoEditavel from '$lib/components/TextoEditavel.svelte';
	import CardConteudo from '$lib/components/ui/CardConteudo.svelte';
	import CabecalhoPagina from '$lib/components/ui/CabecalhoPagina.svelte';
	import Pagina from '$lib/components/ui/Pagina.svelte';
	import SeletorVisao from '$lib/components/ui/SeletorVisao.svelte';
	import { enviando } from '$lib/enviando';
	import { classeLista, getVisao } from '$lib/visao.svelte';
	import type { PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: unknown }>();

	const secoes = $derived(data.secoes as SecaoUi[]);
	const listaAulas = $derived(data.aulas as AulaUi[]);
	let busca = $state('');

	// `listaAulas` é a lista real (seções, contagem e reordenação); `visiveis`
	// é o que sobra da busca por título, o que agrupa e desenha os cartões.
	const visiveis = $derived(
		listaAulas.filter(
			(aula) => !busca.trim() || aula.titulo.toLowerCase().includes(busca.trim().toLowerCase())
		)
	);
	const grupos = $derived(agruparPorSecao(secoes, visiveis));
	let visao = $derived(getVisao());

	const aulasPorSecao = $derived(
		secoes.map((secao) => ({
			secao,
			total: listaAulas.filter((aula) => aula.secaoId === secao.id).length
		}))
	);

	let editandoSecao = $state<number | null>(null);
	let nomeSecao = $state('');

	function valorInicial() {
		return {
			titulo: data.apostila.titulo,
			descricao: data.apostila.descricao ?? ''
		};
	}

	const inicial = valorInicial();
	let titulo = $state(inicial.titulo);
	let descricao = $state(inicial.descricao);

	const sujo = $derived(
		titulo !== data.apostila.titulo || descricao !== (data.apostila.descricao ?? '')
	);

	function confirmar(tituloAula: string) {
		return confirm(`Excluir a aula "${tituloAula}"?`);
	}

	function aoDigitar(event: Event) {
		busca = (event.currentTarget as HTMLInputElement).value;
	}

	function confirmarApostila() {
		return confirm(`Excluir a apostila "${data.apostila.titulo}" e todas as suas aulas?`);
	}

	function confirmarSecao(nome: string, total: number) {
		const aulas = total === 1 ? 'a aula' : `${total} aulas`;
		return confirm(`Excluir a seção "${nome}"? ${aulas} ficará(ão) sem seção.`);
	}

	function comecarRenomear(secaoId: number, nome: string) {
		editandoSecao = secaoId;
		nomeSecao = nome;
	}

	function cancelarRenomear() {
		editandoSecao = null;
		nomeSecao = '';
	}

let erroOrdem = $state('');
	let salvandoOrdem = $state(false);

	async function salvarOrdem(acao: string, dados: unknown) {
		salvandoOrdem = true;
		try {
			const resposta = await fetch(acao, {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({ dados: JSON.stringify(dados) })
			});

			if (!resposta.ok) {
				const retorno = (await resposta.json().catch(() => null)) as {
					data?: { erro?: string };
				} | null;
				erroOrdem = retorno?.data?.erro ?? 'Não foi possível salvar a nova ordem.';
			} else {
				erroOrdem = '';
			}
		} finally {
			salvandoOrdem = false;
		}

		await invalidateAll();
	}

	function moverSecao(origemId: string, destino: { indice: number }) {
		const atual = secoes.map((secao) => secao.id);
		const proxima = moverItem(atual, atual.indexOf(Number(origemId)), destino.indice);
		if (proxima.every((id, i) => id === atual[i])) return;
		void salvarOrdem('?/reordenarSecoes', { ids: proxima });
	}

	function moverAula(origemId: string, destino: { lista: string; indice: number }) {
		// Com busca ativa `grupos` está filtrado: salvar a ordem por ele mandaria
		// só o pedaço visível e bagunçaria o resto. A alça também some nesse caso.
		if (busca.trim()) return;
		const secaoId = destino.lista === '' ? null : Number(destino.lista);
		const atual = grupos.flatMap((grupo) => grupo.aulas);
		const de = atual.findIndex((aula) => String(aula.id) === origemId);
		if (de === -1) return;

		const resto = atual.filter((_, i) => i !== de);
		resto.splice(destino.indice, 0, { ...atual[de], secaoId });
		if (resto.every((aula, i) => aula.id === atual[i].id && aula.secaoId === atual[i].secaoId)) return;

		void salvarOrdem('?/reordenarAulas', {
			ordens: resto.map((aula) => ({ id: aula.id, secaoId: aula.secaoId }))
		});
	}

	const opcoesSecoes = { grupo: 'secoes', aoMover: moverSecao };
	const opcoesAulas = { grupo: 'aulas', aoMover: moverAula };
	const anexarSecoes = arrastar(opcoesSecoes);
	const anexarAulas = arrastar(opcoesAulas);
</script>

<svelte:head>
	<title>{titulo} — mcurso</title>
</svelte:head>

<Pagina largura="amplo" espaco={6}>
	<div class="flex items-center gap-2">
		<a href="/" class="btn btn-ghost btn-sm">← Apostilas</a>
		<span class="divider-horizontal opacity-40"></span>
		<span class="badge badge-outline">Apostila #{data.apostila.id}</span>

		{#if data.user}
			<form
				method="POST"
				action="?/excluir"
				class="ml-auto"
				use:enviando={{ confirmar: confirmarApostila }}
			>
				<button class="btn btn-error btn-ghost btn-sm" type="submit">Excluir apostila</button>
			</form>
		{/if}
	</div>

	{#if form?.erro && form?.alvo !== 'secao'}
		<div class="alert alert-error">{form.erro}</div>
	{/if}

{#if erroOrdem}
			<div class="alert alert-error">{erroOrdem}</div>
		{/if}

		{#if salvandoOrdem}
			<div class="alert alert-info py-1 text-sm">Salvando a nova ordem...</div>
		{/if}


	{#if data.user}
		<form method="POST" action="?/renomear" class="space-y-2" use:enviando>
			<header class="space-y-1">
				<TextoEditavel
					texto={titulo}
					tipo="titulo"
					nivel={1}
					rotulo="Título da apostila"
					marcador="Título da apostila"
					aoDigitar={(valor) => (titulo = valor)}
				/>
				<div class="opacity-80">
					<TextoEditavel
						texto={descricao}
						tipo="texto"
						rotulo="Descrição da apostila"
						marcador="Descrição"
						aoDigitar={(valor) => (descricao = valor)}
					/>
				</div>
			</header>

			<input type="hidden" name="titulo" value={titulo} />
			<input type="hidden" name="descricao" value={descricao} />

			<div class="flex flex-wrap items-center gap-2">
				<button class="btn btn-primary btn-sm" type="submit" disabled={!sujo}>Salvar</button>
				<span class="text-xs opacity-60">
					Clique no título ou na descrição para editar. Depois use “Salvar”.
				</span>
			</div>
		</form>
{:else}
		<CabecalhoPagina titulo={data.apostila.titulo} subtitulo={data.apostila.descricao} />
	{/if}

	{#if data.user}
		<section class="card card-bordered p-4 space-y-3">
			<header class="flex flex-wrap items-center justify-between gap-2">
				<h2 class="font-semibold">Seções</h2>
				<span class="text-xs opacity-60">
					Organizam as aulas em blocos. Escolha a seção no editor da aula.
				</span>
			</header>

			{#if form?.erro && form?.alvo === 'secao'}
				<div class="alert alert-error py-2 text-sm">{form.erro}</div>
			{/if}

			{#if aulasPorSecao.length === 0}
				<div class="alert alert-info py-2 text-sm">
					Nenhuma seção ainda. Crie a primeira abaixo.
				</div>
			{/if}

			<ul class="space-y-2" data-arrasto-lista="secoes" {@attach anexarSecoes}>
				{#each aulasPorSecao as { secao, total } (secao.id)}
					<li
						class="flex flex-wrap items-center gap-2"
						data-secao={secao.id}
						data-arrasto-item={secao.id}
					>
						{#if editandoSecao === secao.id}
<form
								method="POST"
								action="?/renomearSecao"
								class="flex flex-1 items-center gap-2"
								use:enviando={{ sucesso: cancelarRenomear }}
							>
								<input type="hidden" name="secaoId" value={secao.id} />
								<!-- svelte-ignore a11y_autofocus -->
								<input
									class="input input-sm input-bordered flex-1"
									type="text"
									name="nome"
									bind:value={nomeSecao}
									maxlength={LIMITE_NOME_SECAO}
									autofocus
									aria-label={`Nome da seção ${secao.nome}`}
									onkeydown={(event) => {
										if (event.key === 'Escape') cancelarRenomear();
									}}
								/>
								<button class="btn btn-primary btn-sm" type="submit">Salvar</button>
								<button
									class="btn btn-ghost btn-sm"
									type="button"
									onclick={cancelarRenomear}
								>
									Cancelar
								</button>
							</form>
						{:else}
							<button
								class="btn btn-ghost btn-xs"
								type="button"
								data-arrasto-alca
								title="Arrastar para reordenar (ou use as setas do teclado)"
								aria-label={`Mover a seção ${secao.nome}`}
							>
								⠿
							</button>
							<span class="flex-1 font-medium">{secao.nome}</span>
							<span class="badge badge-ghost">
								{total === 1 ? '1 aula' : `${total} aulas`}
							</span>

							<button
								class="btn btn-ghost btn-xs"
								type="button"
								title="Renomear seção"
								aria-label={`Renomear a seção ${secao.nome}`}
								onclick={() => comecarRenomear(secao.id, secao.nome)}
							>
								✎
							</button>
<form
								method="POST"
								action="?/excluirSecao"
								use:enviando={{ confirmar: () => confirmarSecao(secao.nome, total) }}
							>
								<input type="hidden" name="secaoId" value={secao.id} />
								<button
									class="btn btn-error btn-ghost btn-xs"
									type="submit"
									title="Excluir seção"
									aria-label={`Excluir a seção ${secao.nome}`}
								>
									Excluir
								</button>
							</form>
						{/if}
					</li>
				{/each}
			</ul>

			<form
				method="POST"
				action="?/criarSecao"
				class="flex flex-wrap items-center gap-2"
				use:enviando
			>
				<input
					class="input input-sm input-bordered flex-1"
					type="text"
					name="nome"
					placeholder="Nova seção (ex.: Bloco 1)"
					maxlength={LIMITE_NOME_SECAO}
					aria-label="Nome da nova seção"
				/>
				<button class="btn btn-outline btn-sm" type="submit">+ Criar seção</button>
			</form>
		</section>
	{/if}

{#if listaAulas.length > 0}
		<div class="flex flex-wrap items-center justify-between gap-2">
			<span class="text-sm opacity-70">
				{visiveis.length}
				{visiveis.length === 1 ? 'aula' : 'aulas'}
			</span>
			<div class="flex flex-wrap items-center gap-2">
				<input
					class="input input-sm input-bordered w-64"
					type="search"
					placeholder="Buscar por título..."
					aria-label="Buscar aula por título"
					value={busca}
					oninput={aoDigitar}
				/>
				<SeletorVisao />
			</div>
		</div>
	{/if}

	<div class="space-y-6">
		{#if busca.trim() && visiveis.length === 0}
			<div class="alert alert-info">Nada encontrado para "{busca}".</div>
		{/if}

		{#each grupos as grupo, gi (grupo.secao?.id ?? `#${gi}`)}
			<section
				class="space-y-2"
				data-arrasto-lista={grupo.secao ? String(grupo.secao.id) : ''}
				{@attach anexarAulas}
			>
				{#if grupo.secao}
					<h2 class="text-3xl font-bold border-b-2 border-base-300 pb-1">{grupo.secao.nome}</h2>
				{:else if data.user}
					<h2 class="border-b-2 border-dashed border-base-300 pb-1 text-3xl font-bold opacity-60">
						Sem seção
					</h2>
				{/if}

				<ul class={classeLista(visao)}>
					{#each grupo.aulas as aula (aula.id)}
						<CardConteudo
							titulo={aula.titulo}
							descricao={aula.descricao}
							modo={visao}
							rest={{ 'data-arrasto-item': aula.id }}
						>
							{#snippet alca()}
								{#if data.user && !busca.trim()}
									<button
										class="btn btn-ghost btn-xs"
										type="button"
										data-arrasto-alca
										title="Arrastar para reordenar (ou use as setas do teclado)"
										aria-label={`Mover a aula ${aula.titulo}`}
									>
										⠿
									</button>
								{/if}
							{/snippet}

							{#snippet acoes()}
								<a
									href={`/apostilas/${data.apostila.id}/aulas/${aula.id}`}
									class="btn btn-ghost btn-xs"
								>
									Abrir
								</a>
								<a
									href={`/apostilas/${data.apostila.id}/aulas/${aula.id}/imprimir`}
									target="_blank"
									class="btn btn-ghost btn-xs"
								>
									PDF
								</a>

								{#if data.user}
									<a
										href={`/apostilas/${data.apostila.id}/aulas/${aula.id}/editar`}
										class="btn btn-outline btn-xs"
									>
										Editar
									</a>

									<form
										method="POST"
										action="?/excluirAula"
										use:enviando={{ confirmar: () => confirmar(aula.titulo) }}
									>
										<input type="hidden" name="aulaId" value={aula.id} />
										<button class="btn btn-error btn-ghost btn-xs">Excluir</button>
									</form>
								{/if}
							{/snippet}
						</CardConteudo>
					{/each}
				</ul>
			</section>
		{/each}

		{#if listaAulas.length === 0}
			<div class="alert alert-info">
				{#if data.user}
					Nenhuma aula ainda. Crie a primeira com o botão abaixo.
				{:else}
					Nenhuma aula publicada ainda.
				{/if}
			</div>
		{/if}

		{#if data.user}
			<form method="POST" action="?/criarAula" use:enviando>
				<button class="btn btn-outline w-full border-dashed" type="submit">
					+ Nova aula/encontro
				</button>
			</form>
		{/if}
	</div>
</Pagina>
