<script lang="ts">
  import BlocoRender from "./BlocoRender.svelte";
  import CriadorBloco from "./CriadorBloco.svelte";
  import Dissertativa from "./Dissertativa.svelte";
  import EditorBlocoCamada from "./EditorBlocoCamada.svelte";
  import Exercicio from "./Exercicio.svelte";
  import Icone from "./Icone.svelte";
  import TextoEditavel from "./TextoEditavel.svelte";
  import Campo from "./ui/Campo.svelte";
  import {
    criarBloco,
    TIPOS_BLOCO,
    type Bloco,
    type Blocos,
  } from "$lib/blocks";
  import type { AlvoLink } from "$lib/conteudo";
  import { arrastar, moverItem } from "$lib/arrastar";

  type Modo = "editar" | "visualizar";
  type AtualizacaoBloco = Bloco | ((atual: Bloco) => Bloco);
  type Props = {
    blocos: Blocos;
    atualizar: (novos: Blocos) => void;
    apostilaId?: number;
    modo: Modo;
    alvos?: { aulas: AlvoLink[]; anexos: AlvoLink[]; exercicios: AlvoLink[] };
    rotulo?: string;
    aulaContexto?: number;
  };

  let {
    blocos,
    atualizar,
    apostilaId,
    modo,
    alvos,
    rotulo = "aula",
    aulaContexto,
  }: Props = $props();
  let selecionadoId = $state<string | null>(null);
  // Faixa de inserção aberta entre dois blocos. Guarda o id do bloco que vem
  // **depois** do ponto de inserção (e não o índice), para não depender da ordem
  // enquanto o usuário mexe na lista.
  let insercaoAberta = $state<string | null>(null);
  // Valor de `insercaoAberta` para a faixa do topo (não há bloco acima dela para
  // guardar id). Um id de bloco é UUID, então a string não colide.
  const INICIO = "inicio";

  const CAMPOS_COMPARTILHADOS = [
    "texto",
    "nivel",
    "conteudo",
    "codigo",
    "linguagem",
    "diagrama",
    "src",
    "legenda",
    "rotulo",
    "tipoLink",
    "url",
    "alvoId",
    "latex",
    "destaque",
  ] as const;

  function valorVazio(valor: unknown): boolean {
    if (valor === undefined || valor === null) return true;
    if (typeof valor === "string") return valor.trim() === "";
    if (typeof valor === "number") return valor === 0;
    if (typeof valor === "boolean") return !valor;
    if (Array.isArray(valor)) return valor.every((item) => valorVazio(item));
    return false;
  }

  function rotuloTipo(tipo: Bloco["tipo"]): string {
    return TIPOS_BLOCO.find((item) => item.id === tipo)?.rotulo ?? tipo;
  }

  const CAMPOS_CONTEUDO = [
    "texto",
    "conteudo",
    "codigo",
    "diagrama",
    "src",
    "legenda",
    "rotulo",
    "url",
    "aulaId",
    "latex",
    "pergunta",
    "alternativas",
    "explicacao",
    "orientacao",
    "cabecalho",
    "linhas",
  ] as const;

  // Blocos com edição dentro do próprio card (exercício, dissertativa): não têm
  // camada de configuração nem botão "Editar".
  const EM_CARTAO = new Set<Bloco["tipo"]>(["exercicio", "dissertativa"]);

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
      (campo) =>
        campo in origem && campo in destino && !valorVazio(origem[campo]),
    );
  }

  function atualizarBloco(id: string, novo: AtualizacaoBloco) {
    atualizar(
      blocos.map((bloco) =>
        bloco.id === id
          ? typeof novo === "function"
            ? novo(bloco)
            : novo
          : bloco,
      ),
    );
  }

  function adicionar(tipo: Bloco["tipo"]) {
    const bloco = criarBloco(tipo);
    const selecionado = selecionadoId
      ? blocos.findIndex((atual) => atual.id === selecionadoId)
      : -1;
    const copia = [...blocos];
    copia.splice(selecionado === -1 ? copia.length : selecionado + 1, 0, bloco);
    atualizar(copia);
    selecionadoId = bloco.id;
  }

  /**
   * Cria o bloco logo depois de `id` (é o bloco que fica **acima** da faixa onde o
   * usuário clicou). Guardar o id em vez do índice deixa a inserção correta mesmo
   * se a lista mudar enquanto a faixa está aberta.
   */
  function adicionarDepois(id: string, tipo: Bloco["tipo"]) {
    const indice = blocos.findIndex((atual) => atual.id === id);
    if (indice < 0) return;
    const bloco = criarBloco(tipo);
    const copia = [...blocos];
    copia.splice(indice + 1, 0, bloco);
    fecharInsercao();
    atualizar(copia);
    selecionadoId = bloco.id;
  }

  /**
   * Cria o bloco no topo da lista, logo abaixo do título/descrição do conteúdo.
   * `id` é o bloco de baixo (o primeiro): se ele sumir enquanto a faixa está
   * aberta, cai no índice 0 em vez de não criar nada.
   */
  function adicionarAntes(id: string, tipo: Bloco["tipo"]) {
    const indice = blocos.findIndex((atual) => atual.id === id);
    const bloco = criarBloco(tipo);
    const copia = [...blocos];
    copia.splice(indice < 0 ? 0 : indice, 0, bloco);
    fecharInsercao();
    atualizar(copia);
    selecionadoId = bloco.id;
  }

  function fecharInsercao() {
    if (insercaoAberta === null) return;
    insercaoAberta = null;
  }

  /**
   * Clique fora (ou Esc) fecha a faixa. Precisa ser na **fase de captura** e usar
   * `composedPath`: o clique no botão já trocou o `{#if}` e tirou o botão do DOM,
   * então no `onclick` comum o `event.target` já está solto, o `closest` volta
   * `null` e a faixa abriria e fecharia no mesmo clique.
   */
  function insercaoFora(event: MouseEvent) {
    if (insercaoAberta === null) return;
    const dentro = event
      .composedPath()
      .some((nó) => nó instanceof HTMLElement && nó.hasAttribute("data-inserir-bloco"));
    if (dentro) return;
    fecharInsercao();
  }

  function insercaoTecla(event: KeyboardEvent) {
    if (event.key === "Escape") fecharInsercao();
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

  function moverParaIndice(id: string, indice: number) {
    const de = blocos.findIndex((bloco) => bloco.id === id);
    const copia = moverItem(blocos, de, indice);
    if (copia.every((bloco, i) => bloco.id === blocos[i].id)) return;
    atualizar(copia);
  }

  const opcoesArrasto = {
    grupo: "blocos",
    aoMover: (id: string, destino: { indice: number }) =>
      moverParaIndice(id, destino.indice),
  };
  const anexarBlocos = arrastar(opcoesArrasto);

  function trocarTipo(id: string, novoTipo: Bloco["tipo"]): boolean {
    const indice = blocos.findIndex((bloco) => bloco.id === id);
    const atual = blocos[indice];
    if (!atual || atual.tipo === novoTipo) return true;
    const novo = criarBloco(novoTipo);
    if (
      temConteudo(atual) &&
      !preservaDado(atual, novo) &&
      !confirm(
        `Trocar o bloco de "${rotuloTipo(atual.tipo)}" para "${rotuloTipo(novoTipo)}"? O conteúdo atual será perdido.`,
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
      case "codigo":
        return `${bloco.linguagem}:${bloco.codigo}`;
      case "formula":
        return `${bloco.latex}:${bloco.destaque}`;
      default:
        return "";
    }
  }

  function selecionar(id: string) {
    if (modo !== "editar") return;
    selecionadoId = id;
  }

  function atualizarTexto(id: string, valor: string) {
    const atual = blocos.find((bloco) => bloco.id === id);
    if (!atual) return;
    if (atual.tipo === "titulo") {
      atualizarBloco(id, { ...atual, texto: valor });
    } else if (atual.tipo === "texto") {
      atualizarBloco(id, { ...atual, conteudo: valor });
    }
  }
</script>

<svelte:window onclickcapture={insercaoFora} onkeydown={insercaoTecla} />

<div
  class:modo-visualizacao={modo === "visualizar"}
  class="editor-canvas space-y-4"
  data-arrasto-lista="blocos"
  {@attach anexarBlocos}
>
  {#if blocos.length === 0}
    <div class="alert alert-info">
      {modo === "editar"
        ? `Esta ${rotulo} ainda não tem blocos.`
        : `Esta ${rotulo} ainda não tem conteúdo.`}
    </div>
  {/if}

  <!--
    Faixa do topo: mesma coisa da faixa de baixo, mas ancorada na borda de cima
    da lista — é o que permite criar um bloco logo abaixo do título/descrição do
    conteúdo, que fica no cabeçalho acima da lista. Como aqui não existe um
    `article` acima, o botão mora direto no canvas (também absoluto, para não
    entrar no fluxo) e é o próprio botão que se revela no hover.
    Só aparece com blocos na lista: sem nenhum, quem cria o primeiro é o grid do
    fim.
  -->
  {#if modo === "editar" && blocos.length > 0 && insercaoAberta !== INICIO}
    <button
      class="canvas-inserir-btn canvas-inserir-inicio btn btn-xs h-4 min-h-0 w-full rounded-btn border-base-300 font-normal"
      type="button"
      data-inserir-bloco
      title="Adicionar bloco aqui"
      aria-label={`Adicionar bloco antes do bloco 1: ${rotuloTipo(blocos[0].tipo)}`}
      onclick={() => (insercaoAberta = INICIO)}
    >
      <Icone nome="mais" tamanho={12} />
      <span>Adicionar bloco</span>
    </button>
  {/if}

  {#if modo === "editar" && insercaoAberta === INICIO && blocos.length > 0}
    <div class="canvas-inserir-grade space-y-2 py-3" data-inserir-bloco>
      <span class="block text-center text-xs font-semibold uppercase tracking-wide opacity-60"
        >Adicionar bloco antes de “{rotuloTipo(blocos[0].tipo)}”</span
      >
      <CriadorBloco
        aoCriar={(tipo) => adicionarAntes(blocos[0].id, tipo)}
        rotuloGrupo="Tipos de bloco"
      />
    </div>
  {/if}

  {#each blocos as bloco, indice (bloco.id)}
    <article
      class:canvas-bloco-selecionado={modo === "editar" &&
        selecionadoId === bloco.id}
      class="canvas-bloco rounded-box"
      data-canvas-block={bloco.id}
      data-arrasto-item={bloco.id}
      onfocusin={(evento) => {
        if (modo !== "editar") return;
        // O botão da faixa de inserção mora dentro do bloco: focá-lo não pode
        // selecionar o bloco, senão a camada de configuração abre, o bloco
        // cresce e o `pointerup` cai fora do botão (o clique nunca acontece).
        if ((evento.target as HTMLElement).closest("[data-inserir-bloco]")) return;
        selecionar(bloco.id);
      }}
    >
      {#if modo === "editar" && (bloco.tipo === "titulo" || bloco.tipo === "texto")}
        <div class="canvas-conteudo">
          <TextoEditavel
            texto={bloco.tipo === "titulo" ? bloco.texto : bloco.conteudo}
            tipo={bloco.tipo}
            nivel={bloco.tipo === "titulo" ? bloco.nivel : undefined}
            aoDigitar={(valor) => atualizarTexto(bloco.id, valor)}
            aoFocar={() => selecionar(bloco.id)}
          />
        </div>
      {:else if modo === "editar" && (bloco.tipo === "exercicio" || bloco.tipo === "dissertativa")}
        <div class="canvas-conteudo">
          {#if bloco.tipo === "exercicio"}
            <Exercicio
              {bloco}
              modo="editar"
              atualizar={(transformar) => atualizarBloco(bloco.id, transformar)}
            />
          {:else}
            <Dissertativa
              {bloco}
              modo="editar"
              atualizar={(transformar) => atualizarBloco(bloco.id, transformar)}
            />
          {/if}
        </div>
      {:else}
        <div
          class="canvas-conteudo canvas-visual"
          role="group"
          aria-label={`Prévia do bloco ${bloco.tipo}`}
          onpointerdown={() => selecionar(bloco.id)}
        >
          {#key `${bloco.id}:${chaveVisual(bloco)}`}
            <BlocoRender {bloco} {apostilaId} {modo} {aulaContexto} />
          {/key}
        </div>
      {/if}

      {#if modo === "editar" && selecionadoId === bloco.id}
        {#if bloco.tipo === "titulo"}
          <div class="canvas-configuracao">
            <Campo rotulo="Nível" id={`nivel-${bloco.id}`} class="w-auto">
              <select
                id={`nivel-${bloco.id}`}
                class="select select-xs select-bordered"
                value={bloco.nivel}
                onchange={(event) =>
                  atualizarBloco(bloco.id, {
                    ...bloco,
                    nivel: Number(event.currentTarget.value) as 1 | 2 | 3,
                  })}
              >
                <option value={1}>H1</option>
                <option value={2}>H2</option>
                <option value={3}>H3</option>
              </select>
            </Campo>
          </div>
        {:else if bloco.tipo !== "texto" && !EM_CARTAO.has(bloco.tipo)}
          <EditorBlocoCamada
            {bloco}
            atualizar={(transformar) => atualizarBloco(bloco.id, transformar)}
            {alvos}
          />
        {/if}
      {/if}

      {#if modo === "editar"}
        <div class="canvas-acciones">
          <div class="flex items-center gap-1">
            <button
              class="btn btn-xs btn-ghost"
              type="button"
              data-arrasto-alca
              title="Arrastar para reordenar (ou use as setas do teclado)"
              aria-label={`Mover bloco ${indice + 1}: ${rotuloTipo(bloco.tipo)}`}
            >
              ⠿
            </button>
            {#if bloco.tipo !== "titulo" && bloco.tipo !== "texto" && !EM_CARTAO.has(bloco.tipo)}
              <button
                class="btn btn-xs btn-outline"
                type="button"
                onclick={() => selecionar(bloco.id)}
              >
                {selecionadoId === bloco.id ? "Editando" : "Editar"}
              </button>
            {/if}
            <select
              class="select select-xs select-ghost"
              aria-label="Tipo do bloco"
              value={bloco.tipo}
              onchange={(event) => {
                event.stopPropagation();
                const select = event.currentTarget;
                if (!trocarTipo(bloco.id, select.value as Bloco["tipo"])) {
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
              }}>Duplicar</button
            >
            <button
              class="btn btn-xs btn-error btn-ghost"
              type="button"
              title="Remover bloco"
              onclick={(event) => {
                event.stopPropagation();
                remover(bloco.id);
              }}>Remover</button
            >
          </div>
        </div>
      {/if}

      <!--
        Botão da faixa de inserção: fica dentro do bloco, ancorado na borda de
        baixo, flutuando sobre o vão. Fora do fluxo de propósito — se entrasse
        como irmão, o `space-y-3` contaria a faixa duas vezes e cada vão
        cresceria 0.75rem, que é justamente o vai e volta que a faixa evita.
        Só não existe no último bloco: para acrescentar no fim quem serve é o
        grid do fim da lista.
      -->
      {#if modo === "editar" && indice < blocos.length - 1 && insercaoAberta !== bloco.id}
        <button
          class="canvas-inserir-btn btn btn-xs h-4 min-h-0 w-full rounded-btn border-base-300 font-normal"
          type="button"
          data-inserir-bloco
          title="Adicionar bloco aqui"
          aria-label={`Adicionar bloco depois do bloco ${indice + 1}: ${rotuloTipo(bloco.tipo)}`}
          onclick={() => (insercaoAberta = bloco.id)}
        >
          <Icone nome="mais" tamanho={12} />
          <span>Adicionar bloco</span>
        </button>
      {/if}
    </article>

    {#if modo === "editar" && insercaoAberta === bloco.id}
      <div class="canvas-inserir-grade space-y-2 py-3" data-inserir-bloco>
        <span class="block text-center text-xs font-semibold uppercase tracking-wide opacity-60"
          >Adicionar bloco depois de “{rotuloTipo(bloco.tipo)}”</span
        >
        <CriadorBloco aoCriar={(tipo) => adicionarDepois(bloco.id, tipo)} rotuloGrupo="Tipos de bloco" />
      </div>
    {/if}
  {/each}

  {#if modo === "editar"}
    <div class="canvas-adicionar space-y-2">
      <span class="text-xs font-semibold uppercase tracking-wide opacity-60"
        >Adicionar bloco</span
      >
      <CriadorBloco aoCriar={adicionar} />
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
    transition:
      border-color 120ms ease,
      background-color 120ms ease;
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
    padding: 1rem 0 0.25rem;
    border-top: 1px dashed color-mix(in srgb, currentColor 20%, transparent);
  }

  /* Botão da faixa de inserção: absoluto na borda de baixo do bloco, centrado no
   vão entre ele e o próximo (1rem do `space-y-4`). Só aparece no hover — a lib
   não tem "revelar no hover" e `opacity-0` dela é `!important`, então a
   transição vive aqui. */
  .canvas-inserir-btn {
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1.05rem;
    z-index: 1;
    border-style: dashed;
    opacity: 0;
    transition: opacity 120ms ease;
  }

  .canvas-bloco:hover .canvas-inserir-btn,
  .canvas-inserir-btn:hover,
  .canvas-inserir-btn:focus-visible {
    opacity: 1;
  }

  /* Faixa do topo: no vão entre o cabeçalho (título/descrição) e o primeiro
   bloco. Mesmo deslocamento do vão de baixo, agora para cima. */
  .canvas-inserir-inicio {
    top: -1.05rem;
    bottom: auto;
  }

  /* Sem hover não existe o gatilho: no toque quem cria bloco é o grid do fim. */
  @media (hover: none) {
    .canvas-inserir-btn {
      display: none;
    }
  }

  /* Aberta, a grade ocupa o fluxo e empurra os vizinhos. */
  .canvas-inserir-grade {
    border-top: 1px dashed color-mix(in srgb, currentColor 20%, transparent);
    border-bottom: 1px dashed color-mix(in srgb, currentColor 20%, transparent);
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
