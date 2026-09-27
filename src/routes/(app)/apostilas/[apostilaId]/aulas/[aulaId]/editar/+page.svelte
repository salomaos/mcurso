<script lang="ts">
	import EditorCanvas from '$lib/components/EditorCanvas.svelte';
	import TextoEditavel from '$lib/components/TextoEditavel.svelte';
	import type { Blocos, SecaoUi } from '$lib/blocks';
	import { mesmoNomeSecao } from '$lib/blocks';
	import type { PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: unknown }>();
	let modo = $state<'editar' | 'visualizar'>('editar');

	const secoes = $derived(data.secoes as SecaoUi[]);

	function valorInicial() {
		return {
			titulo: data.aula.titulo,
			descricao: data.aula.descricao ?? '',
			secaoId: data.aula.secaoId as number | null,
			blocos: data.aula.blocos
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
	<title>Editar #{data.aula.id} — {data.apostila.titulo}</title>
</svelte:head>

<div class="container max-w-5xl px-4 py-6 space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<a href={`/apostilas/${data.apostila.id}/aulas/${data.aula.id}`} class="btn btn-ghost btn-sm">
			← Voltar para a aula
		</a>

		<div class="flex flex-wrap items-center gap-3">
			<span class="text-sm opacity-60">
				Aula #{data.aula.id} · Apostila "{data.apostila.titulo}"
			</span>
			<div class="join" role="group" aria-label="Modo do editor">
				<button
					class:btn-primary={modo === 'editar'}
					class="btn btn-sm"
					type="button"
					aria-pressed={modo === 'editar'}
					onclick={() => (modo = 'editar')}
				>
					Editar
				</button>
				<button
					class:btn-primary={modo === 'visualizar'}
					class="btn btn-sm"
					type="button"
					aria-pressed={modo === 'visualizar'}
					onclick={() => (modo = 'visualizar')}
				>
					Visualizar
				</button>
			</div>
		</div>
	</div>

	{#if form?.erro}
		<div class="alert alert-error">{form.erro}</div>
	{/if}

	<form method="POST" action="?/salvar" class="space-y-4">
		<header class="card card-bordered p-4 space-y-2">
			{#if modo === 'editar'}
				<p class="text-sm opacity-60">
					Edite o título, a seção e a descrição direto no conteúdo, e os blocos no quadro abaixo.
				</p>

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
						<label class="text-sm font-semibold" for="secao-aula">Seção</label>
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

				<TextoEditavel
					texto={titulo}
					tipo="titulo"
					nivel={1}
					rotulo="Título da aula"
					marcador="Título da aula"
					focarAoMontar={data.novo}
					aoDigitar={(valor) => (titulo = valor)}
				/>

				<div class="opacity-80">
					<TextoEditavel
						texto={descricao}
						tipo="texto"
						rotulo="Descrição da aula"
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

		<EditorCanvas {blocos} atualizar={atualizarBlocos} apostilaId={data.apostila.id} {modo} />

		<input type="hidden" name="blocos" value={JSON.stringify(blocos)} />

		<div class="flex flex-wrap items-center gap-2">
			{#if modo === 'editar'}
				<button class="btn btn-primary" type="submit">Salvar aula</button>
			{:else}
				<button class="btn btn-outline" type="button" onclick={() => (modo = 'editar')}>
					Continuar editando
				</button>
			{/if}
			<a href={`/apostilas/${data.apostila.id}/aulas/${data.aula.id}`} class="btn btn-ghost">Cancelar</a>
		</div>
	</form>
</div>
