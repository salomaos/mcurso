<script lang="ts">
	import type { Bloco } from '$lib/blocks';
	import Codigo from './Codigo.svelte';
	import Mermaid from './Mermaid.svelte';
	import Formula from './Formula.svelte';
	import Exercicio from './Exercicio.svelte';

	let { bloco, apostilaId, baseHref = '/apostilas' } = $props();

	function hrefAula(aulaId: number) {
		return `${baseHref}/${apostilaId}/aulas/${aulaId}`;
	}
</script>

{#if bloco.tipo === 'titulo'}
	{#if bloco.nivel === 1}
		<h1 class="text-3xl font-bold mt-6 mb-2">{bloco.texto}</h1>
	{:else if bloco.nivel === 3}
		<h3 class="text-xl font-semibold mt-4 mb-1">{bloco.texto}</h3>
	{:else}
		<h2 class="text-2xl font-bold mt-5 mb-2">{bloco.texto}</h2>
	{/if}
{:else if bloco.tipo === 'texto'}
	<div class="whitespace-pre-wrap leading-relaxed">{bloco.conteudo}</div>
{:else if bloco.tipo === 'codigo'}
	<Codigo codigo={bloco.codigo} linguagem={bloco.linguagem} />
{:else if bloco.tipo === 'mermaid'}
	<div class="bg-base-100 border border-base-300 p-4 rounded-box my-2">
		<Mermaid diagrama={bloco.diagrama} id={bloco.id} />
	</div>
{:else if bloco.tipo === 'imagem'}
	<figure class="my-3">
		<img src={bloco.src} alt={bloco.legenda ?? ''} class="rounded-box max-w-full" />
		{#if bloco.legenda}
			<figcaption class="text-sm opacity-80 mt-1 text-center">{bloco.legenda}</figcaption>
		{/if}
	</figure>
{:else if bloco.tipo === 'link'}
	{@const ext = bloco.tipoLink === 'externo'}
	<a
		href={ext ? bloco.url : hrefAula(bloco.aulaId)}
		target={ext ? '_blank' : undefined}
		rel={ext ? 'noopener noreferrer' : undefined}
		class="badge badge-outline gap-1 py-3 px-2"
	>
		<span class="text-xs uppercase font-semibold">{bloco.tipoLink}</span>
		<span>{bloco.rotulo}</span>
		{#if ext}
			<span class="text-[10px] opacity-60">↗</span>
		{/if}
	</a>
{:else if bloco.tipo === 'tabela'}
	<div class="overflow-x-auto my-3">
		<table class="table table-bordered table-sm">
			{#if bloco.cabecalho.length > 0}
				<thead>
					<tr>
						{#each bloco.cabecalho as celula}
							<th>{celula || ''}</th>
						{/each}
					</tr>
				</thead>
			{/if}
			<tbody>
				{#each bloco.linhas as linha}
					<tr>
						{#each linha as celula}
							<td>{celula || ''}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else if bloco.tipo === 'formula'}
	<Formula latex={bloco.latex} destaque={bloco.destaque} />
{:else if bloco.tipo === 'exercicio'}
	<Exercicio bloco={bloco} />
{/if}