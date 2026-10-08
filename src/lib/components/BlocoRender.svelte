<script lang="ts">
	import { hrefLinkInterno, type Bloco, type BlocoLink, type NivelTitulo } from '$lib/blocks';
	import Codigo from './Codigo.svelte';
	import Mermaid from './Mermaid.svelte';
	import Formula from './Formula.svelte';
	import Exercicio from './Exercicio.svelte';
	import Dissertativa from './Dissertativa.svelte';
	import Simulacao from './Simulacao.svelte';
	import TextoMarkdown from './TextoMarkdown.svelte';

	// `imprimir` só muda o bloco de simulação (canvas não sai no papel, o código sai);
	// para o resto é o mesmo que `visualizar`.
	type Modo = 'editar' | 'visualizar' | 'imprimir';
	// `Exercicio`/`Dissertativa`/`Simulacao` só conhecem os dois primeiros, então a
	// impressão cai em `visualizar` para elas (só a simulação distingue a impressão).
	type ModoConteudo = 'editar' | 'visualizar';
	type Props = {
		bloco: Bloco;
		apostilaId?: number;
		baseHref?: string;
		modo?: Modo;
		/** Aula onde o bloco está: link de atividade ganha o `?aula=` do contexto. */
		aulaContexto?: number;
	};

	let { bloco, apostilaId, baseHref = '/apostilas', modo = 'visualizar', aulaContexto }: Props =
		$props();

	// `imprimir` não é um terceiro comportamento para o resto dos blocos (só a
	// simulação distingue impressão de leitura), então eles recebem `visualizar`.
	const modoConteudo = $derived(modo as ModoConteudo);

	const ROTULO_LINK: Record<BlocoLink['tipoLink'], string> = {
		aula: 'aula',
		anexo: 'anexo',
		exercicio: 'atividade',
		externo: 'link'
	};

	// Um lugar só para os 6 níveis: a tag (`h1`…`h6`), o tamanho e o respiro saem
	// daqui, então trocar a escala é uma linha.
	const TITULO_CLASSE: Record<NivelTitulo, string> = {
		1: 'text-3xl font-bold mt-6 mb-2',
		2: 'text-2xl font-bold mt-5 mb-2',
		3: 'text-xl font-semibold mt-4 mb-1',
		4: 'text-lg font-semibold mt-3 mb-1',
		5: 'text-base font-semibold mt-2 mb-1',
		6: 'text-sm font-medium uppercase tracking-wide mt-2 mb-1'
	};
</script>

{#if bloco.tipo === 'titulo'}
	<svelte:element this={`h${bloco.nivel}`} class={TITULO_CLASSE[bloco.nivel]}>{bloco.texto}</svelte:element>
{:else if bloco.tipo === 'texto'}
	<TextoMarkdown conteudo={bloco.conteudo} />
{:else if bloco.tipo === 'codigo'}
	<Codigo codigo={bloco.codigo} linguagem={bloco.linguagem} />
{:else if bloco.tipo === 'mermaid'}
	<div class="bg-base-100 border border-base-300 p-4 rounded-box my-2">
		<Mermaid diagrama={bloco.diagrama} id={bloco.id} tema={bloco.tema} />
	</div>
{:else if bloco.tipo === 'imagem'}
	<figure class="my-3 flex flex-col items-center">
		<img src={bloco.src} alt={bloco.legenda ?? ''} class="rounded-box max-w-full" />
		{#if bloco.legenda}
			<figcaption class="text-sm opacity-80 mt-1 text-left w-fit self-start">{bloco.legenda}</figcaption>
		{/if}
	</figure>
{:else if bloco.tipo === 'link'}
	{@const hrefInterno = hrefLinkInterno(bloco, apostilaId, baseHref, aulaContexto)}
	{@const externo = bloco.tipoLink === 'externo'}
	<a
		href={hrefInterno ?? bloco.url}
		target={externo ? '_blank' : undefined}
		rel={externo ? 'noopener noreferrer' : undefined}
		class="badge badge-outline gap-1 py-3 px-2"
		onclick={(event) => {
			if (modo === 'editar') event.preventDefault();
		}}
	>
		<span class="text-xs uppercase font-semibold">{ROTULO_LINK[bloco.tipoLink]}</span>
		<span>{bloco.rotulo}</span>
		{#if externo}
			<span class="text-xs opacity-60">↗</span>
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
	<Exercicio bloco={bloco} modo={modoConteudo} />
{:else if bloco.tipo === 'dissertativa'}
	<Dissertativa bloco={bloco} modo={modoConteudo} />
{:else if bloco.tipo === 'simulacao'}
	{#if modo === 'imprimir'}
		<!-- Canvas não imprime (a iframe não roda no papel): sai o código, que é o que
		     o aluno precisa para rodar a simulação em p5/q5. -->
		<div class="my-3 space-y-2">
			<div class="text-xs uppercase tracking-wide opacity-60 font-semibold">
				Simulação interativa ({bloco.biblioteca}) — código
			</div>
			<Codigo codigo={bloco.codigo} linguagem="js" />
		</div>
	{:else}
		<div class="my-3">
			<Simulacao bloco={bloco} modo={modoConteudo} />
		</div>
	{/if}
{/if}
