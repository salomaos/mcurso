<script lang="ts">
	import type { Bloco, BlocoLink } from '$lib/blocks';
	import { ROTULO_ALVO, ROTULO_EDITAR, ROTULO_VISUALIZAR, type AlvoLink, type TipoAlvo } from '$lib/conteudo';
	import {
		LARGURAS_LINK,
		POSICOES_LINK,
		TAMANHOS_LINK,
		TEMAS_MERMAID,
		ehLarguraLink,
		ehPosicaoLink,
		ehTamanhoLink
	} from '$lib/blocks';
	import { markdownInlineParaHtml } from '$lib/markdown';
	import {
		ALINHAMENTOS,
		CLASSE_ALINHAMENTO,
		alinhamentoComum,
		areaValida,
		celulaEm,
		celulasNaArea,
		definirAlinhamento,
		definirColunasCabecalho,
		definirLegenda,
		definirLinhasCabecalho,
		definirTexto,
		definirTh,
		definirZebrada,
		inserirColuna,
		inserirLinha,
		lerTabela,
		mesclar,
		montarTabela,
		normalizarArea,
		removerColuna,
		removerLinha,
		separar,
		type AreaTabela,
		type CelulaRender,
		type DadosTabela
	} from '$lib/tabela';
	import BarraAcoes from './ui/BarraAcoes.svelte';
	import Campo from './ui/Campo.svelte';
	import SeletorAlvo from './SeletorAlvo.svelte';

	type Props = {
		bloco: Bloco;
		atualizar: (transformar: (atual: Bloco) => Bloco) => void;
		alvos?: { aulas: AlvoLink[]; anexos: AlvoLink[]; exercicios: AlvoLink[] };
	};

	let { bloco, atualizar, alvos }: Props = $props();
	let enviando = $state(false);
	let erroUpload = $state<string | null>(null);

	function alterar(campo: string, valor: string | number | boolean | undefined) {
		atualizar((atual) => ({ ...atual, [campo]: valor } as Bloco));
	}

	function escolherAlvo(alvo: AlvoLink | null) {
		atualizar((atual) => {
			if (atual.tipo !== 'link') return atual;
			const rotulo = alvo && !atual.rotulo.trim() ? alvo.titulo : atual.rotulo;
			return { ...atual, rotulo, alvoId: alvo?.id, url: undefined };
		});
	}

	// Trocar o tipo limpa o destino anterior (alvo ou URL).
	function alterarTipoLink(tipo: string) {
		atualizar((atual) => {
			if (atual.tipo !== 'link') return atual;
			return { ...atual, tipoLink: tipo as BlocoLink['tipoLink'], alvoId: undefined, url: undefined };
		});
	}

	// ---------------------------------------------------------------------------
	// Tabela
	//
	// O editor fala em **coordenada de grade** (linha/coluna de `montarTabela`),
	// nunca no índice do array: com mescla os dois divergem, e é a coordenada que
	// permite remover a coluna que um `rowspan` atravessa sem deixar span
	// pendurado em célula que não existe mais.
	//
	// A seleção é um retângulo: clique marca uma célula, Shift+clique amplia.
	// Mesclar exige retângulo que não corte célula nenhuma (`areaValida`) e juntar
	// não perde texto (todo texto da área entra na célula mesclada); separar
	// devolve as `colspan × rowspan` células com o texto na primeira. Remover
	// linha/coluna é ação da célula selecionada — os `×` avulsos saíram.
	// ---------------------------------------------------------------------------
	let selecao = $state<AreaTabela | null>(null);

	function selecionar(celula: CelulaRender, estender: boolean) {
		selecao =
			estender && selecao
				? { ...selecao, linha1: celula.linha, coluna1: celula.coluna }
				: {
						linha0: celula.linha,
						coluna0: celula.coluna,
						linha1: celula.linha,
						coluna1: celula.coluna
					};
	}

	function mudarTabela(transformar: (dados: DadosTabela) => DadosTabela) {
		atualizar((atual) => {
			if (atual.tipo !== 'tabela') return atual;
			return { ...atual, ...transformar(atual) };
		});
	}

	/** Muda a tabela a partir da área selecionada (no-op sem seleção). */
	function comArea(acao: (dados: DadosTabela, area: AreaTabela) => DadosTabela) {
		const area = selecao;
		if (!area) return;
		mudarTabela((dados) => acao(dados, area));
	}

	function celulaDaSelecao(): CelulaRender | null {
		const area = selecao;
		if (!area || bloco.tipo !== 'tabela') return null;
		const tabela = montarTabela(bloco);
		// A âncora é a célula inicial; se a área começar numa posição coberta
		// (span de cima), vale a primeira célula que começa dentro dela.
		return (
			celulaEm(tabela, { linha: area.linha0, coluna: area.coluna0 }) ??
			celulasNaArea(tabela, area)[0] ??
			null
		);
	}

	function removerLinhaSelecionada() {
		const celula = celulaDaSelecao();
		if (!celula) return;
		mudarTabela((dados) => removerLinha(dados, celula.linha));
		selecao = null;
	}

	function removerColunaSelecionada() {
		const celula = celulaDaSelecao();
		if (!celula) return;
		mudarTabela((dados) => removerColuna(dados, celula.coluna));
		selecao = null;
	}

	function editarCelula(celula: CelulaRender, texto: string) {
		mudarTabela((dados) =>
			definirTexto(dados, { linha: celula.linha, coluna: celula.coluna }, texto)
		);
	}

	function dentroDaSelecao(celula: CelulaRender, area: AreaTabela | null): boolean {
		if (!area) return false;
		const alvo = normalizarArea(area);
		return (
			celula.linha >= alvo.linha0 &&
			celula.linha <= alvo.linha1 &&
			celula.coluna >= alvo.coluna0 &&
			celula.coluna <= alvo.coluna1
		);
	}

	/** Opções do select de cabeçalho: 0..N (limitado a 6) mais o valor atual. */
	function opcoesAte(total: number, atual: number): number[] {
		const maximo = Math.min(Math.max(total, 1), 6);
		const valores = new Set<number>([atual]);
		for (let n = 0; n <= maximo; n++) valores.add(n);
		return [...valores].sort((a, b) => a - b);
	}

	function rotuloLinhasCabecalho(quantidade: number): string {
		if (quantidade === 0) return 'Sem cabeçalho';
		return quantidade === 1 ? '1 linha de cabeçalho' : `${quantidade} linhas de cabeçalho`;
	}

	function rotuloColunasCabecalho(quantidade: number): string {
		if (quantidade === 0) return 'Sem coluna de cabeçalho';
		return quantidade === 1 ? '1 coluna de cabeçalho' : `${quantidade} colunas de cabeçalho`;
	}

	// Colar JSON bruto da tabela: aceita formato curto (`cabecalho` + `linhas`) ou
	// canônico (`linhas` + contagens). Aplica tudo e limpa a seleção.
	let jsonColado = $state('');
	let erroJson = $state<string | null>(null);

	/**
	 * Alterna, dentro do bloco de tabela, entre a edição e a mesma leitura que o
	 * aluno recebe (markdown nas células, `scope`, legenda), sem sair do editor.
	 */
	let tabelaFinal = $state(false);

	/** Exporta a tabela atual (formato canônico) para o textarea, como exemplo. */
	function exportarJsonAtual() {
		if (bloco.tipo !== 'tabela') return;
		const { linhas, linhasCabecalho, colunasCabecalho, legenda, zebrada } = bloco;
		const dados: DadosTabela = { linhas, linhasCabecalho, colunasCabecalho };
		if (legenda) dados.legenda = legenda;
		if (zebrada) dados.zebrada = true;
		jsonColado = JSON.stringify(dados, null, 2);
		erroJson = null;
	}

	function aplicarJson() {
		const texto = jsonColado.trim();
		if (!texto) {
			erroJson = null;
			return;
		}
		try {
			const bruto = JSON.parse(texto);
			const lido = lerTabela(bruto);
			if (!lido) throw new Error('Estrutura inválida para tabela');
			mudarTabela(() => ({ ...lido }));
			jsonColado = '';
			erroJson = null;
			selecao = null;
		} catch (erro) {
			erroJson = erro instanceof Error ? erro.message : 'JSON inválido';
		}
	}

	async function enviarImagem(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const arquivo = input.files?.[0];
		if (!arquivo) return;
		enviando = true;
		erroUpload = null;
		const dadosFormulario = new FormData();
		dadosFormulario.append('arquivo', arquivo);
		try {
			const resposta = await fetch('/api/upload', { method: 'POST', body: dadosFormulario });
			// O 413 do adapter-node (`BODY_SIZE_LIMIT`) sai como página de erro, não JSON;
			// a rota do app responde JSON com `erro` em qualquer recusa própria.
			const dados = (await resposta.json().catch(() => ({}))) as { src?: string; erro?: string };
			if (!resposta.ok || !dados.src) {
				throw new Error(
					dados.erro ??
						(resposta.status === 413
							? 'Arquivo grande demais para o servidor (limite do host).'
							: 'Não foi possível enviar a imagem.')
				);
			}
			alterar('src', dados.src);
		} catch (erro) {
			erroUpload = erro instanceof Error ? erro.message : 'Não foi possível enviar a imagem.';
		} finally {
			enviando = false;
		}
	}
</script>

<div class="canvas-source space-y-3">
		{#if bloco.tipo === 'codigo'}
			<Campo rotulo="Linguagem" id={`linguagem-${bloco.id}`}>
				<input
					id={`linguagem-${bloco.id}`}
					class="input input-sm input-bordered"
					type="text"
					value={bloco.linguagem}
					oninput={(event) => alterar('linguagem', event.currentTarget.value)}
					placeholder="js, ts, python..."
				/>
			</Campo>
			<Campo rotulo="Código fonte" id={`codigo-${bloco.id}`}>
				<textarea
					id={`codigo-${bloco.id}`}
					class="textarea textarea-bordered w-full font-mono min-h-32"
					value={bloco.codigo}
					oninput={(event) => alterar('codigo', event.currentTarget.value)}
					placeholder="// código aqui"
				></textarea>
			</Campo>
		{:else if bloco.tipo === 'mermaid'}
			<Campo rotulo="Definição Mermaid" id={`mermaid-${bloco.id}`}>
				{#snippet extra()}
					<select
						id={`mermaid-tema-${bloco.id}`}
						class="select select-sm select-bordered w-40 shrink-0"
						aria-label="Tema do diagrama Mermaid"
						value={bloco.tema}
						onchange={(event) => alterar('tema', event.currentTarget.value)}
					>
						{#each TEMAS_MERMAID as tema (tema.valor)}
							<option value={tema.valor}>{tema.rotulo}</option>
						{/each}
					</select>
				{/snippet}
				<textarea
					id={`mermaid-${bloco.id}`}
					class="textarea textarea-bordered w-full font-mono min-h-36"
					value={bloco.diagrama}
					oninput={(event) => alterar('diagrama', event.currentTarget.value)}
					placeholder="flowchart LR\n  A --> B"
				></textarea>
			</Campo>
		{:else if bloco.tipo === 'imagem'}
			<Campo rotulo="URL da imagem" id={`imagem-src-${bloco.id}`}>
				<input
					id={`imagem-src-${bloco.id}`}
					class="input input-sm input-bordered"
					type="text"
					value={bloco.src}
					oninput={(event) => alterar('src', event.currentTarget.value)}
					placeholder="/uploads/... ou URL"
				/>
			</Campo>
			<Campo rotulo="Legenda" id={`imagem-legenda-${bloco.id}`}>
				<input
					id={`imagem-legenda-${bloco.id}`}
					class="input input-sm input-bordered"
					type="text"
					value={bloco.legenda ?? ''}
					oninput={(event) => alterar('legenda', event.currentTarget.value || undefined)}
					placeholder="Legenda opcional"
				/>
			</Campo>
			<label class="btn btn-outline btn-sm w-fit cursor-pointer">
				<input class="hidden" type="file" accept="image/*" disabled={enviando} onchange={enviarImagem} />
				{enviando ? 'Enviando...' : 'Enviar imagem'}
			</label>
			{#if erroUpload}
				<div class="alert alert-error py-2 text-sm">{erroUpload}</div>
			{/if}
		{:else if bloco.tipo === 'link'}
			<Campo rotulo="Texto do link" id={`link-rotulo-${bloco.id}`}>
				<input
					id={`link-rotulo-${bloco.id}`}
					class="input input-sm input-bordered"
					type="text"
					value={bloco.rotulo}
					oninput={(event) => alterar('rotulo', event.currentTarget.value)}
					placeholder="Texto exibido"
				/>
			</Campo>
			<Campo rotulo="Tipo" id={`link-tipo-${bloco.id}`}>
				<select
					id={`link-tipo-${bloco.id}`}
					class="select select-sm select-bordered"
					value={bloco.tipoLink}
					onchange={(event) => alterarTipoLink(event.currentTarget.value)}
				>
					<option value="aula">Aula</option>
					<option value="anexo">Anexo</option>
					<option value="exercicio">Atividade</option>
					<option value="externo">Externo</option>
				</select>
			</Campo>
			{#if bloco.tipoLink === 'aula' || bloco.tipoLink === 'anexo' || bloco.tipoLink === 'exercicio'}
				<Campo rotulo={ROTULO_ALVO[bloco.tipoLink as TipoAlvo]}>
					<SeletorAlvo
						tipoLink={bloco.tipoLink as TipoAlvo}
						alvos={alvos?.[
							bloco.tipoLink === 'anexo'
								? 'anexos'
								: bloco.tipoLink === 'exercicio'
									? 'exercicios'
									: 'aulas'
						] ?? []}
						alvoId={bloco.alvoId}
						aoEscolher={escolherAlvo}
					/>
				</Campo>
			{:else}
				<Campo rotulo="URL" id={`link-url-${bloco.id}`}>
					<input
						id={`link-url-${bloco.id}`}
						class="input input-sm input-bordered"
						type="text"
						value={bloco.url ?? ''}
						oninput={(event) => alterar('url', event.currentTarget.value)}
						placeholder="https://..."
				/>
				</Campo>
			{/if}
			<Campo rotulo="Tamanho" id={`link-tamanho-${bloco.id}`}>
				<select
					id={`link-tamanho-${bloco.id}`}
					class="select select-sm select-bordered"
					value={bloco.tamanho}
					onchange={(event) => {
						if (ehTamanhoLink(event.currentTarget.value)) {
							alterar('tamanho', event.currentTarget.value);
						}
					}}
				>
					{#each TAMANHOS_LINK as tamanho (tamanho.valor)}
						<option value={tamanho.valor}>{tamanho.rotulo}</option>
					{/each}
				</select>
			</Campo>
			<Campo rotulo="Largura" id={`link-largura-${bloco.id}`}>
				<select
					id={`link-largura-${bloco.id}`}
					class="select select-sm select-bordered"
					value={bloco.largura}
					onchange={(event) => {
						if (ehLarguraLink(event.currentTarget.value)) {
							alterar('largura', event.currentTarget.value);
						}
					}}
				>
					{#each LARGURAS_LINK as largura (largura.valor)}
						<option value={largura.valor}>{largura.rotulo}</option>
					{/each}
				</select>
			</Campo>
			{#if bloco.largura !== 'full'}
				<Campo rotulo="Posição" id={`link-posicao-${bloco.id}`}>
					<select
						id={`link-posicao-${bloco.id}`}
						class="select select-sm select-bordered"
						value={bloco.posicao}
						onchange={(event) => {
							if (ehPosicaoLink(event.currentTarget.value)) {
								alterar('posicao', event.currentTarget.value);
							}
						}}
					>
						{#each POSICOES_LINK as posicao (posicao.valor)}
							<option value={posicao.valor}>{posicao.rotulo}</option>
						{/each}
					</select>
				</Campo>
			{/if}
	{:else if bloco.tipo === 'tabela'}
		{@const tabela = montarTabela(bloco)}
		{@const area = selecao ? normalizarArea(selecao) : null}
		{@const selecionadas = area ? celulasNaArea(tabela, area) : []}
		{@const podeMesclar = area !== null && selecionadas.length > 1 && areaValida(tabela, area)}
		{@const temMescla = selecionadas.some(
			(celula) => celula.colspan > 1 || celula.rowspan > 1
		)}
		{@const todasCabecalho = selecionadas.length > 0 && selecionadas.every((celula) => celula.th)}
		{@const podeCabecalho = selecionadas.some(
			(celula) =>
				celula.linha >= tabela.linhasCabecalho && celula.coluna >= tabela.colunasCabecalho
		)}
		{@const alinhamentoAtual = alinhamentoComum(selecionadas)}

		<!-- Mesmo `join` dos outros blocos: alterna a edição com a face do aluno
		     (markdown nas células, `scope`, legenda), sem sair do editor. -->
		<div class="flex justify-end">
			<div class="join" role="group" aria-label="Modo da tabela">
				<button
					class:btn-primary={!tabelaFinal}
					class="btn btn-xs"
					type="button"
					aria-pressed={!tabelaFinal}
					onclick={() => (tabelaFinal = false)}
				>
					{ROTULO_EDITAR}
				</button>
				<button
					class:btn-primary={tabelaFinal}
					class="btn btn-xs"
					type="button"
					aria-pressed={tabelaFinal}
					onclick={() => (tabelaFinal = true)}
				>
					{ROTULO_VISUALIZAR}
				</button>
			</div>
		</div>

		{#if tabelaFinal}
			<!-- Face do aluno: o mesmo markup da leitura (`BlocoRender`). -->
			{#snippet celulaLeitura(celula: CelulaRender, escopo: 'col' | 'row')}
				{@const classe = celula.alinhamento ? CLASSE_ALINHAMENTO[celula.alinhamento] : ''}
				{#if celula.th}
					<th colspan={celula.colspan} rowspan={celula.rowspan} scope={escopo} class={classe}>
						{@html markdownInlineParaHtml(celula.texto)}
					</th>
				{:else}
					<td colspan={celula.colspan} rowspan={celula.rowspan} class={classe}>
						{@html markdownInlineParaHtml(celula.texto)}
					</td>
				{/if}
			{/snippet}
			<div class="tabela-bloco overflow-x-auto">
				<table
					class={bloco.zebrada
						? 'table table-bordered table-sm table-zebra'
						: 'table table-bordered table-sm'}
				>
					{#if bloco.legenda}
						<caption class="tabela-legenda">{bloco.legenda}</caption>
					{/if}
					{#if tabela.linhasCabecalho > 0}
						<thead>
							{#each tabela.linhas.slice(0, tabela.linhasCabecalho) as linha}
								<tr>
									{#each linha.celulas as celula}
										{@render celulaLeitura(celula, 'col')}
									{/each}
								</tr>
							{/each}
						</thead>
					{/if}
					<tbody>
						{#each tabela.linhas.slice(tabela.linhasCabecalho) as linha}
							<tr>
								{#each linha.celulas as celula}
									{@render celulaLeitura(celula, 'row')}
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
		{#snippet campoTexto(celula: CelulaRender)}
			<input
				class="input input-xs input-bordered w-full"
				type="text"
				value={celula.texto}
				placeholder={celula.th ? 'Coluna' : 'Valor'}
				oninput={(event) => editarCelula(celula, event.currentTarget.value)}
				onclick={(event) => selecionar(celula, event.shiftKey)}
			/>
		{/snippet}

		{#snippet campoCelula(celula: CelulaRender)}
			{@const classe = celula.alinhamento ? CLASSE_ALINHAMENTO[celula.alinhamento] : ''}
			{@const marcada = dentroDaSelecao(celula, area)}
			{#if celula.th}
				<th
					colspan={celula.colspan}
					rowspan={celula.rowspan}
					data-celula-selecionada={marcada ? '' : undefined}
					class="min-w-28 {classe}"
				>
					{@render campoTexto(celula)}
				</th>
			{:else}
				<td
					colspan={celula.colspan}
					rowspan={celula.rowspan}
					data-celula-selecionada={marcada ? '' : undefined}
					class="min-w-28 {classe}"
				>
					{@render campoTexto(celula)}
				</td>
			{/if}
		{/snippet}

		<BarraAcoes rotulo="Tabela" acoesRotulo="Estrutura da tabela">
			<button class="btn btn-ghost btn-xs" type="button" onclick={() => mudarTabela(inserirColuna)}>
				+ Coluna
			</button>
			<button class="btn btn-ghost btn-xs" type="button" onclick={() => mudarTabela(inserirLinha)}>
				+ Linha
			</button>
			<select
				class="select select-xs select-bordered"
				aria-label="Linhas de cabeçalho"
				value={String(tabela.linhasCabecalho)}
				onchange={(event) =>
					mudarTabela((dados) => definirLinhasCabecalho(dados, Number(event.currentTarget.value)))}
			>
				{#each opcoesAte(tabela.linhas.length, tabela.linhasCabecalho) as quantidade (quantidade)}
					<option value={String(quantidade)}>{rotuloLinhasCabecalho(quantidade)}</option>
				{/each}
			</select>
			<select
				class="select select-xs select-bordered"
				aria-label="Colunas de cabeçalho"
				value={String(tabela.colunasCabecalho)}
				onchange={(event) =>
					mudarTabela((dados) => definirColunasCabecalho(dados, Number(event.currentTarget.value)))}
			>
				{#each opcoesAte(tabela.colunas, tabela.colunasCabecalho) as quantidade (quantidade)}
					<option value={String(quantidade)}>{rotuloColunasCabecalho(quantidade)}</option>
				{/each}
			</select>
			<label class="flex items-center gap-1 text-xs">
				<input
					class="checkbox checkbox-xs"
					type="checkbox"
					checked={bloco.zebrada === true}
					onchange={(event) =>
						mudarTabela((dados) => definirZebrada(dados, event.currentTarget.checked))}
				/>
				Zebrada
			</label>
		</BarraAcoes>

		{#if selecionadas.length === 0}
			<p class="text-xs opacity-60">Clique numa célula; Shift+clique amplia a seleção.</p>
		{:else}
			<BarraAcoes
				rotulo={`${selecionadas.length} ${selecionadas.length === 1 ? 'célula selecionada' : 'células selecionadas'}`}
				acoesRotulo="Célula selecionada"
			>
				<button
					class="btn btn-xs btn-outline"
					type="button"
					disabled={!podeMesclar}
					onclick={() => comArea((dados, alvo) => mesclar(dados, alvo) ?? dados)}
				>
					Mesclar células
				</button>
				<button
					class="btn btn-xs btn-outline"
					type="button"
					disabled={!temMescla}
					onclick={() => comArea(separar)}
				>
					Separar células
				</button>
				<button
					class="btn btn-xs btn-outline"
					type="button"
					disabled={!podeCabecalho}
					aria-pressed={todasCabecalho}
					onclick={() => comArea((dados, alvo) => definirTh(dados, alvo, !todasCabecalho))}
				>
					Cabeçalho da célula
				</button>
				<div class="join" role="group" aria-label="Alinhamento da célula">
					{#each ALINHAMENTOS as opcao (opcao.valor)}
						<button
							class="btn btn-xs btn-outline"
							type="button"
							aria-pressed={alinhamentoAtual === opcao.valor}
							onclick={() => comArea((dados, alvo) => definirAlinhamento(dados, alvo, opcao.valor))}
						>
							{opcao.rotulo}
						</button>
					{/each}
				</div>
				<button class="btn btn-xs btn-outline" type="button" onclick={removerLinhaSelecionada}>
					Remover linha
				</button>
				<button class="btn btn-xs btn-outline" type="button" onclick={removerColunaSelecionada}>
					Remover coluna
				</button>
			</BarraAcoes>
		{/if}

		<div class="overflow-x-auto">
			<table class="table table-bordered table-sm">
				{#if tabela.linhasCabecalho > 0}
					<thead>
						{#each tabela.linhas.slice(0, tabela.linhasCabecalho) as linha}
							<tr>
								{#each linha.celulas as celula}
									{@render campoCelula(celula)}
								{/each}
							</tr>
						{/each}
					</thead>
				{/if}
				<tbody>
					{#each tabela.linhas.slice(tabela.linhasCabecalho) as linha}
						<tr>
							{#each linha.celulas as celula}
								{@render campoCelula(celula)}
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<Campo rotulo="Legenda" id={`tabela-legenda-${bloco.id}`}>
			<input
				id={`tabela-legenda-${bloco.id}`}
				class="input input-sm input-bordered"
				type="text"
				value={bloco.legenda ?? ''}
				oninput={(event) =>
					mudarTabela((dados) => definirLegenda(dados, event.currentTarget.value))}
				placeholder="Título da tabela (opcional)"
			/>
		</Campo>

		<Campo rotulo="Colar estrutura JSON da tabela" id={`tabela-json-${bloco.id}`}>
			<div class="flex justify-end mb-2">
				<button type="button" class="btn btn-xs" onclick={exportarJsonAtual}>
					Exportar estrutura JSON
				</button>
			</div>
			<textarea
				id={`tabela-json-${bloco.id}`}
				class="textarea textarea-bordered w-full font-mono text-xs min-h-24"
				placeholder={`Ex.: {"cabecalho":["x","y"],"linhas":[["1","2"]]}\nou {"linhas":[["x","y"],["1","2"]],"linhasCabecalho":1}`}
				value={jsonColado}
				oninput={(event) => (jsonColado = event.currentTarget.value)}
				onblur={() => aplicarJson()}
			></textarea>
			{#if erroJson}
				<span class="text-error text-xs mt-1">{erroJson}</span>
			{/if}
		</Campo>
		{/if}
	{:else if bloco.tipo === 'formula'}
		<Campo rotulo="Definição LaTeX" id={`formula-${bloco.id}`}>
			<textarea
				id={`formula-${bloco.id}`}
				class="textarea textarea-bordered w-full font-mono min-h-20"
				value={bloco.latex}
				oninput={(event) => alterar('latex', event.currentTarget.value)}
				placeholder="E = mc^2"
			></textarea>
		</Campo>
		<label class="flex items-center gap-2 text-sm">
			<input
				class="toggle toggle-sm"
				type="checkbox"
				checked={bloco.destaque}
				onchange={(event) => alterar('destaque', event.currentTarget.checked)}
			/>
			Fórmula em destaque
		</label>
	{/if}
</div>
