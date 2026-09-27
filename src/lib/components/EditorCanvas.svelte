<script lang="ts">
	import BlocoRender from './BlocoRender.svelte';
	import EditorBlocoCamada from './EditorBlocoCamada.svelte';
	import Exercicio from './Exercicio.svelte';
	import TextoEditavel from './TextoEditavel.svelte';
	import { criarBloco, TIPOS_BLOCO, type Bloco, type Blocos } from '$lib/blocks';

	type Modo = 'editar' | 'visualizar';
	type AtualizacaoBloco = Bloco | ((atual: Bloco) => Bloco);
	type Props = {
		blocos: Blocos;
		atualizar: (novos: Blocos) => void;
		apostilaId: number;
		modo: Modo;
	};

	let { blocos, atualizar, apostilaId, modo }: Props = $props();
	let novoTipo = $state<Bloco['tipo']>('texto');
	let selecionadoId = $state<string | null>(null);

	const CAMPOS_COMPARTILHADOS = [
		'texto',
		'nivel',
		'conteudo',
		'codigo',
		'linguagem',
		'diagrama',
		'src',
		'legenda',
		'rotulo',
		'tipoLink',
		'url',
		'aulaId',
		'latex',
		'destaque'
	] as const;

	function valorVazio(valor: unknown): boolean {
		if (valor === undefined || valor === null) return true;
		if (typeof valor === 'string') return valor.trim() === '';
		if (typeof valor === 'number') return valor === 0;
		if (typeof valor === 'boolean') return !valor;
		if (Array.isArray(valor)) return valor.every((item) => valorVazio(item));
		return false;
	}

	function rotuloTipo(tipo: Bloco['tipo']): string {
		return TIPOS_BLOCO.find((item) => item.id === tipo)?.rotulo ?? tipo;
	}

	const CAMPOS_CONTEUDO = [
		'texto',
		'conteudo',
		'codigo',
		'diagrama',
		'src',
		'legenda',
		'rotulo',
		'url',
		'aulaId',
		'latex',
		'pergunta',
		'alternativas',
		'explicacao',
		'cabecalho',
		'linhas'
	] as const;

	function temConteudo(bloco: Bloco): boolean {
		const padrao = criarBloco(bloco.tipo) as unknown as Record<string, unknown>;
		const atual = bloco as unknown as Record<string, unknown>;
		return CAMPOS_CONTEUDO.some((campo) => {
			if (!(campo in atual)) return false;
			const valor = atual[campo];
			if (valorVazio(valor)) return false;
			return JSON.stringify(valor) !== JSON.stringify(padrao[campo] ?? null);
		});
	}

	function preservaDado(atual: Bloco, novo: Bloco): boolean {
		const origem = atual as unknown as Record<string, unknown>;
		const destino = novo as unknown as Record<string, unknown>;
		return CAMPOS_COMPARTILHADOS.some(
			(campo) => campo in origem && campo in destino && !valorVazio(origem[campo])
		);
	}

	function atualizarBloco(id: string, novo: AtualizacaoBloco) {
		atualizar(
			blocos.map((bloco) =>
				bloco.id === id ? (typeof novo === 'function' ? novo(bloco) : novo) : bloco
			)
		);
	}

	function adicionar(tipo: Bloco['tipo'] = novoTipo, posicao = blocos.length) {
		const bloco = criarBloco(tipo);
		const copia = [...blocos];
		copia.splice(posicao, 0, bloco);
		atualizar(copia);
		selecionadoId = bloco.id;
	}

	function remover(id: string) {
		atualizar(blocos.filter((bloco) => bloco.id !== id));
		if (selecionadoId === id) selecionadoId = null;
	}

	function duplicar(id: string) {
		const indice = blocos.findIndex((bloco) => bloco.id === id);
		if (indice < 0) return;
		const original = blocos[indice];
		const copia = structuredClone($state.snapshot(original));
		copia.id = crypto.randomUUID();
		const novos = [...blocos];
		novos.splice(indice + 1, 0, copia);
		atualizar(novos);
		selecionadoId = copia.id;
	}

	function mover(id: string, delta: -1 | 1) {
		const indice = blocos.findIndex((bloco) => bloco.id === id);
		const destino = indice + delta;
		if (indice < 0 || destino < 0 || destino >= blocos.length) return;
		const copia = [...blocos];
		[copia[indice], copia[destino]] = [copia[destino], copia[indice]];
		atualizar(copia);
	}

	function trocarTipo(id: string, novoTipo: Bloco['tipo']): boolean {
		const indice = blocos.findIndex((bloco) => bloco.id === id);
		const atual = blocos[indice];
		if (!atual || atual.tipo === novoTipo) return true;
		const novo = criarBloco(novoTipo);
		if (
			temConteudo(atual) &&
			!preservaDado(atual, novo) &&
			!confirm(
				`Trocar o bloco de "${rotuloTipo(atual.tipo)}" para "${rotuloTipo(novoTipo)}"? O conteúdo atual será perdido.`
			)
		)
			return false;
		const origem = atual as unknown as Record<string, unknown>;
		const destino = novo as unknown as Record<string, unknown>;
		for (const campo of CAMPOS_COMPARTILHADOS) {
			if (campo in origem && campo in destino && origem[campo] !== undefined)
				destino[campo] = origem[campo];
		}
		novo.id = atual.id;
		atualizarBloco(id, novo);
		selecionadoId = id;
		return true;
	}

	function chaveVisual(bloco: Bloco) {
		switch (bloco.tipo) {
			case 'codigo':
				return `${bloco.linguagem}:${bloco.codigo}`;
			case 'formula':
				return `${bloco.latex}:${bloco.destaque}`;
			default:
				return '';
		}
	}

	function selecionar(id: string) {
		if (modo !== 'editar') return;
		selecionadoId = id;
	}

	function atualizarTexto(id: string, valor: string) {
		const atual = blocos.find((bloco) => bloco.id === id);
		if (!atual) return;
		if (atual.tipo === 'titulo') {
			atualizarBloco(id, { ...atual, texto: valor });
		} else if (atual.tipo === 'texto') {
			atualizarBloco(id, { ...atual, conteudo: valor });
		}
	}
</script>

<div class:modo-visualizacao={modo === 'visualizar'} class="editor-canvas space-y-3">
	{#if blocos.length === 0}
		<div class="alert alert-info">
			{modo === 'editar' ? 'Esta aula ainda não tem blocos.' : 'Esta aula ainda não tem conteúdo.'}
		</div>
	{/if}

	{#each blocos as bloco, indice (bloco.id)}
		<article
			class:canvas-bloco-selecionado={modo === 'editar' && selecionadoId === bloco.id}
			class="canvas-bloco rounded-box"
			data-canvas-block={bloco.id}
			onfocusin={() => modo === 'editar' && selecionar(bloco.id)}
		>
			{#if modo === 'editar' && (bloco.tipo === 'titulo' || bloco.tipo === 'texto')}
				<div class="canvas-conteudo">
					<TextoEditavel
						texto={bloco.tipo === 'titulo' ? bloco.texto : bloco.conteudo}
						tipo={bloco.tipo}
						nivel={bloco.tipo === 'titulo' ? bloco.nivel : undefined}
						aoDigitar={(valor) => atualizarTexto(bloco.id, valor)}
						aoFocar={() => selecionar(bloco.id)}
					/>
				</div>
			{:else if modo === 'editar' && bloco.tipo === 'exercicio'}
				<div class="canvas-conteudo">
					<Exercicio
						bloco={bloco}
						modo="editar"
						atualizar={(transformar) => atualizarBloco(bloco.id, transformar)}
					/>
				</div>
			{:else}
				<div
					class="canvas-conteudo canvas-visual"
					role="group"
					aria-label={`Prévia do bloco ${bloco.tipo}`}
					onpointerdown={() => selecionar(bloco.id)}
				>
					{#key `${bloco.id}:${chaveVisual(bloco)}`}
						<BlocoRender bloco={bloco} {apostilaId} {modo} />
					{/key}
				</div>
			{/if}

			{#if modo === 'editar' && selecionadoId === bloco.id}
				{#if bloco.tipo === 'titulo'}
					<div class="canvas-configuracao">
						<label class="label text-xs" for={`nivel-${bloco.id}`}>
							<span class="label-text">Nível</span>
						</label>
						<select
							id={`nivel-${bloco.id}`}
							class="select select-xs select-bordered"
							value={bloco.nivel}
							onchange={(event) => atualizarBloco(bloco.id, { ...bloco, nivel: Number(event.currentTarget.value) as 1 | 2 | 3 })}
						>
							<option value={1}>H1</option>
							<option value={2}>H2</option>
							<option value={3}>H3</option>
						</select>
					</div>
				{:else if bloco.tipo !== 'texto' && bloco.tipo !== 'exercicio'}
					<EditorBlocoCamada
						bloco={bloco}
						atualizar={(transformar) => atualizarBloco(bloco.id, transformar)}
					/>
				{/if}
			{/if}

			{#if modo === 'editar'}
				<div class="canvas-acciones">
					<div class="flex items-center gap-1">
						{#if bloco.tipo !== 'titulo' && bloco.tipo !== 'texto' && bloco.tipo !== 'exercicio'}
							<button
								class="btn btn-xs btn-outline"
								type="button"
								onclick={() => selecionar(bloco.id)}
							>
								{selecionadoId === bloco.id ? 'Editando' : 'Editar'}
							</button>
						{/if}
						<button
							class="btn btn-xs btn-ghost"
							type="button"
							disabled={indice === 0}
							title="Mover para cima"
							onclick={(event) => {
								event.stopPropagation();
								mover(bloco.id, -1);
							}}
						>↑</button>
						<button
							class="btn btn-xs btn-ghost"
							type="button"
							disabled={indice === blocos.length - 1}
							title="Mover para baixo"
							onclick={(event) => {
								event.stopPropagation();
								mover(bloco.id, 1);
							}}
						>↓</button>
						<select
							class="select select-xs select-ghost"
							aria-label="Tipo do bloco"
							value={bloco.tipo}
							onchange={(event) => {
								event.stopPropagation();
								const select = event.currentTarget;
								if (!trocarTipo(bloco.id, select.value as Bloco['tipo'])) {
									select.value = bloco.tipo;
								}
							}}
						>
							{#each TIPOS_BLOCO as tipo}
								<option value={tipo.id}>{tipo.rotulo}</option>
							{/each}
						</select>
					</div>
					<div class="flex items-center gap-1">
						<button
							class="btn btn-xs btn-ghost"
							type="button"
							title="Duplicar bloco"
							onclick={(event) => {
								event.stopPropagation();
								duplicar(bloco.id);
							}}
						>Duplicar</button>
						<button
							class="btn btn-xs btn-error btn-ghost"
							type="button"
							title="Remover bloco"
							onclick={(event) => {
								event.stopPropagation();
								remover(bloco.id);
							}}
						>Remover</button>
					</div>
				</div>
			{/if}
		</article>
	{/each}

	{#if modo === 'editar'}
		<div class="canvas-adicionar">
			<select class="select select-sm select-bordered" aria-label="Tipo do novo bloco" bind:value={novoTipo}>
				{#each TIPOS_BLOCO as tipo}
					<option value={tipo.id}>{tipo.rotulo}</option>
				{/each}
			</select>
			<button class="btn btn-sm btn-outline w-72" type="button" onclick={() => adicionar()}>
				+ Adicionar bloco
			</button>
		</div>
	{/if}
</div>

<style>
	.editor-canvas {
		position: relative;
	}

	.canvas-bloco {
		position: relative;
		border: 1px solid transparent;
		padding: 0.75rem;
		transition: border-color 120ms ease, background-color 120ms ease;
	}

	.editor-canvas:not(.modo-visualizacao) .canvas-bloco:hover,
	.canvas-bloco-selecionado {
		border-color: color-mix(in srgb, currentColor 25%, transparent);
		background: color-mix(in srgb, currentColor 4%, transparent);
	}

	.canvas-conteudo {
		min-width: 0;
	}

	.editor-canvas:not(.modo-visualizacao) .canvas-visual {
		cursor: pointer;
	}

	.canvas-visual {
		overflow: hidden;
	}

	.canvas-configuracao,
	.canvas-acciones {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.canvas-configuracao {
		justify-content: flex-start;
		margin-top: 0.5rem;
	}

	.canvas-acciones {
		margin-top: 0.5rem;
		opacity: 0.55;
	}

	.canvas-bloco:hover .canvas-acciones,
	.canvas-bloco-selecionado .canvas-acciones {
		opacity: 1;
	}

	.canvas-adicionar {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem 0 0.25rem;
		border-top: 1px dashed color-mix(in srgb, currentColor 20%, transparent);
	}

	:global(.canvas-bloco .canvas-source) {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px dashed color-mix(in srgb, currentColor 20%, transparent);
	}

	@media (max-width: 640px) {
		.canvas-bloco {
			padding: 0.5rem;
		}

		.canvas-acciones {
			align-items: flex-start;
			flex-direction: column;
		}
	}
</style>
