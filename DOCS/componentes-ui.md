# Componentes de UI — plano de extração

Levantamento feito em 01/10/2026 sobre `src/routes`, `src/lib/components` e `src/app.css`.
Objetivo: eliminar divergência entre telas do mesmo tipo (larguras, botões, formulários) sem
recriar o que a `@ahmartecnologias/ahmardesign` já resolve.

**Regra de ouro:** o wrapper é fino. Ele padroniza *intenção* e *encapsula decisão*, mas
aparência continua sendo a classe da lib. Se um caso não cabe no componente, passe `class`
ou não use o componente — não estenda a API para caber.

**Como acompanhar:** a coluna **Status** deste arquivo é a fonte da verdade do que já foi
feito. Ao concluir um item, mude para `✅` e registre a data. Ao começar, `🚧`.

| Legenda | Significado |
| --- | --- |
| ⬜ | não iniciado |
| 🚧 | em andamento |
| ✅ | concluído |

---

## Diagnóstico (contagens da varredura)

| Padrão | Ocorrências |
| --- | --- |
| `container max-w-* px-4 py-* space-y-*` (4 larguras) | 10 |
| `btn` montado à mão | ~54 |
| `form-control` / `label-text` (3 markups) | 14 / 17 |
| `flex justify-between gap-2` como barra de ações | 9 |
| `alert alert-*` | 23 |
| `<h1 class="text-3xl font-bold">` + subtítulo | 8 |
| `card card-bordered p-N space-y-N` | 8 |
| pluralização `n === 1 ? 'x' : 'xs'` | 6 |
| `badge badge-ghost` | 7 |
| `{form POST}` + hidden input + botão Excluir | 5 |
| glifo `⠿` de arrasto | 3 |

### Achados que motivam o plano

1. **`/anexos` e `/exercicios` são o mesmo arquivo com o nome trocado** — ~110 linhas
   duplicadas (busca, cabeçalho, cartão, "usado em N aulas", ações).
2. **Largura do mesmo conteúdo muda com o modo**: leitura/impressão `max-w-3xl` vs edição
   `max-w-5xl`. E "criar" é `2xl` numa tela e `5xl` nas outras.
3. **`VisualizarConteudo.svelte:43`** renderiza "Apresentar" como `btn btn-sm` sem variante,
   enquanto `anexos/+page.svelte:128` usa `btn btn-ghost btn-sm`.
4. **Rótulo de impressão tem 4 nomes** ("Imprimir/PDF", "Imprimir / salvar PDF",
   "Imprimir / PDF", "PDF") — três deles já são contrato de E2E.
5. **Bug latente**: em `exercicios/[exercicioId]/+page.svelte:137,188` o `apostilaId` não é
   repassado ao `BlocoRender`, então `hrefLinkInterno` devolve `null` e um link para aula
   dentro das *instruções* da atividade renderiza `<a href="">`.

---

## P0 — criar primeiro

### ✅ P0.1 `Pagina` — `src/lib/components/ui/Pagina.svelte`

> **Feito em 01/10/2026.** Props: `largura` (`estreito` 2xl / `conteudo` 3xl / `amplo` 5xl),
> `espaco` (3–6), `class`. Padding lateral sai do `.container` da lib (removido o `px-4`
> redundante). Todas as 10 ocorrências migradas; o `pt-8` da impressão segue via `class`.
> Bônus: `EditorConteudo` ganhou o snippet `rodape`, que eliminou o container duplicado de
> `exercicios/[exercicioId]/editar`.

| | |
| --- | --- |
| **Problema** | `container max-w-* px-4 py-* space-y-*` repetido com 4 larguras (`2xl`/`3xl`/`5xl`), 3 ritmos de `space-y` (`4`/`5`/`6`) e `pt-8` só na impressão. O `px-4` é redundante: `.container` da lib já põe `padding: 1rem`. |
| **Props** | `largura?: 'estreito' \| 'conteudo' \| 'amplo'`, `espaco?: 4 \| 5 \| 6`, `class?: string` |
| **Mapeamento** | `estreito` = `max-w-2xl` (criação) · `conteudo` = `max-w-3xl` (leitura/impressão) · `amplo` = `max-w-5xl` (edição/listagens) |
| **Ocorrências** | `routes/+page.svelte:11` · `apostilas/nova/+page.svelte:11` · `apostilas/[apostilaId]/+page.svelte:115` · `anexos/+page.svelte:30` · `exercicios/+page.svelte:30` · `exercicios/[exercicioId]/+page.svelte:84` · `exercicios/[exercicioId]/editar/+page.svelte:21` · `EditorConteudo.svelte:95` · `ImprimirConteudo.svelte:30` · `VisualizarConteudo.svelte:33` |
| **Esforço / risco** | Baixo / Baixo |

### ✅ P0.2 `PainelSoltos` — `src/lib/components/ui/PainelSoltos.svelte`

> **Feito em 01/10/2026.** `anexos/+page.svelte` foi de 153 → 47 linhas e
> `exercicios/+page.svelte` de 166 → 71 (as ~110 duplicadas saíram).
> É **genérico** (`generics="T extends ItemSoltos"`), então a página de atividades
> recebe o `ExercicioUi` inteiro e usa `exercicio.questoes` direto no snippet
> `marcadores`, sem `Map` de lookup.
> Props de conteúdo (substantivos): `titulo`, `singular`, `plural`, `descricao`,
> `rotuloCriar`, `rotuloBusca`, `rotuloVazio`, `nomeId`, `rotuloTipoExcluir`,
> `tituloSemUso`, `tituloEmUso`. Snippets: `marcadores` (só a atividade usa) e `acoes`.
> O form de exclusão (hidden + `confirm()` + botão desabilitado em uso) ficou **dentro**
> do painel — era a parte mais duplicada.
> Contratos de E2E preservados: card é `<li>`, botão `Excluir`, `Usado em 1 aula`,
> `Sem uso`, `getByLabel('Buscar anexo'/'Buscar atividade')`.

| | |
| --- | --- |
| **Problema** | `/anexos` e `/exercicios` são o mesmo painel. Manter os dois em sincronia já custa: o card de atividade tem badges que o de anexo não tem. |
| **Props** | `singular`, `plural`, `descricao`, `rotuloCriar`, `vazio`, `busca`, `aoBuscar`, `total`, `filtrados` + snippets `cabecalhoCartao` e `acoesCartao` |
| **Ocorrências** | `anexos/+page.svelte:5-152` vs `exercicios/+page.svelte:5-165` (~110 linhas) |
| **Esforço / risco** | Médio / Baixo (E2E `anexos.spec.ts` e `exercicios.spec.ts` cobrem os dois) |

### ✅ P0.3 `BarraAcoes` — `src/lib/components/ui/BarraAcoes.svelte`

> **Feito em 01/10/2026.** Props: `voltar`, `rotulo`, `rotuloClass`, `noPrint`, `acoesRotulo`
> (`role="group"`), `acoesClass`, `class`. Migradas: `VisualizarConteudo`,
> `ImprimirConteudo`, `EditorConteudo`, `Mermaid.svelte` e `EditorBlocoCamada.svelte`
> (os dois últimos são toolbars internas, sem link de volta).
> Junto vieram as **constantes de rótulo** em `$lib/conteudo.ts` (`ROTULO_EDITAR`,
> `ROTULO_APRESENTAR`, `ROTULO_IMPRIMIR`, `ROTULO_IMPRIMIR_PAGINA`,
> `ROTULO_IMPRIMIR_RESULTADO`, `ROTULO_VISUALIZAR`, `ROTULO_RESPONDER_DE_NOVO`) — os
> literais viraram constante, nenhuma string mudou. São **três** de impressão, não duas
> (ver lição 2 no fim do doc).
>
> Ficou de fora (é rodapé de card, não barra de página): `apostilas/[apostilaId]/+page.svelte:330-362`,
> `anexos/+page.svelte:114-130`, `exercicios/+page.svelte:129-143` — vão para o P2.2 `AcoesConteudo`.

| | |
| --- | --- |
| **Problema** | Padrão "voltar à esquerda, ações à direita" reconstruído 9× com rótulos, tamanhos e variantes divergentes. |
| **Props** | `voltar: { href, rotulo }`, `noPrint?: boolean`, `class?: string` |
| **Ocorrências** | `VisualizarConteudo.svelte:34-49` · `ImprimirConteudo.svelte:31-36` · `EditorConteudo.svelte:96-124` · `anexos/+page.svelte:114-130` · `exercicios/+page.svelte:129-143` · `exercicios/[exercicioId]/+page.svelte:99-104,157-161` · `apostilas/[apostilaId]/+page.svelte:329-361` · `EditorBlocoCamada.svelte:241-251` · `Mermaid.svelte:368-409` |
| **Notas** | Mover os rótulos para constantes em `$lib/conteudo.ts` junto com a extração. |
| **Esforço / risco** | Baixo / Baixo (só layout) |

### ✅ P0.4 `Alternativa` — `src/lib/components/Alternativa.svelte`

> **Feito em 01/10/2026.** Props: `letra`, `texto`, `tipo`, `name`, `value`,
> `resultado?` (gabarito na tela), `marcada?`, `escolhida?`, `checked?`, `desabilitada?`,
> `aoEscolher?` (preview do editor) e `children?` (slot no fim do rótulo).
> `checked` e `desabilitada` ficaram com o **chamador** porque os dois usos legítimos
> divergem: no runner o `checked` só existe depois do POST, no preview do editor vem da
> seleção local.
> Unificou `Questao.svelte` (aluno, form e resultado) e `Exercicio.svelte` (preview do
> editor). Ganho de paridade: o preview agora usa os mesmos badges `gabarito` /
> `selecionada` do resultado, que antes eram só texto solto.
> Contratos preservados: `aria-label="Alternativa X"` no `<input>`, texto do `<label>`
> intacto, `toHaveText('Terceira')`. `e2e/exercicios.spec.ts` + `e2e/fluxo.spec.ts` verdes.
> Fora: a linha de edição da alternativa (`Exercicio.svelte:173-206`, com `TextoEditavel`
> e botão de remover) e a variante de apresentação (`Apresentacao.svelte`, ver P3.2) —
> são markups diferentes por natureza, não duplicação.

| | |
| --- | --- |
| **Problema** | Alternativa duplicada quase literal entre o runner (`Questao`) e o editor (`Exercicio`), com variação no modo apresentação. Divergir aqui quebra a paridade aluno/professor. |
| **Props** | `letra`, `texto`, `tipo: 'radio' \| 'checkbox'`, `name`, `value`, `marcada?`, `gabarito?`, `desabilitada?`, `rodape?: Snippet` |
| **Ocorrências** | `Questao.svelte:19-82` · `Exercicio.svelte:108-114,232-276` · `Apresentacao.svelte:99-130` (variante em grid) |
| **Risco — atenção** | Os E2E usam `getByLabel('Alternativa A', { exact: true }).check()` (`exercicios.spec.ts:101,102,144,150,246-248,286`; `fluxo.spec.ts:127-132`) e `toHaveText('Terceira')` (`fluxo.spec.ts:153`). O `aria-label` do `<input>` e o texto dentro do `<label>` precisam sobreviver intactos. Rodar `pnpm exec playwright test e2e/exercicios.spec.ts e2e/fluxo.spec.ts` é obrigatório. |
| **Esforço / risco** | Médio / Médio |

### ✅ P0.5 `Campo` — `src/lib/components/ui/Campo.svelte`

> **Feito em 01/10/2026.** Props: `rotulo`, `id?`, `dica?`, `extra?` (snippet), `class?`.
> O `form-control` só existe mais dentro do próprio `Campo`. Migrados: `EditorBlocoCamada`
> (10), `EditorCanvas`, `Exercicio`, `EditorConteudo`, `login`, `apostilas/nova`,
> `exercicios/[exercicioId]`.
> Corrigidos no caminho: os dois labels sem `for` (`EditorBlocoCamada` do `SeletorAlvo` e o
> `Seção` do `EditorConteudo`), o `<div class="label">` no lugar de `<label>`, os
> `label.text-xs` redundantes e o `max-w-full` repetido no `textarea`.
> Linhas compactas (canvas, exercício) usam `class="w-auto"` para o campo não esticar.
> **`extra` usa flex puro, não `.label`** (ver lição 1 no fim do doc): com o padding da
> lib o select de tema do Mermaid desalinhava 8px e a spec mede essa borda.

| | |
| --- | --- |
| **Problema** | 14 `form-control` com 3 markups diferentes e 2 labels sem `for` (`EditorBlocoCamada.svelte:208`, `EditorConteudo.svelte:173`), o que quebra o clique no rótulo. |
| **Props** | `rotulo: string`, `id: string`, `dica?: string`, `class?: string` |
| **Ocorrências** | `EditorBlocoCamada.svelte:92,105,118,144,157,178,191,208,226,307` · `EditorCanvas.svelte:271-274` · `Exercicio.svelte:140-142` · `EditorConteudo.svelte:173` · `login/+page.svelte:23-35` · `apostilas/nova/+page.svelte:23-31` · `exercicios/[exercicioId]/+page.svelte:167-183` |
| **Esforço / risco** | Baixo / Baixo |

---

## P1

### ⬜ P1.1 `CabecalhoPagina` — `src/lib/components/ui/CabecalhoPagina.svelte`

Par "badge + `<h1 class="text-3xl font-bold">` + subtítulo" 8× com hierarquias inconsistentes
(`space-y-1` vs `space-y-2`, badge antes ou depois do h1).
`routes/+page.svelte:12-16` · `apostilas/[apostilaId]/+page.svelte:169-176` ·
`VisualizarConteudo.svelte:51-57` · `ImprimirConteudo.svelte:43-52` ·
`EditorConteudo.svelte:224-232` · `exercicios/[exercicioId]/+page.svelte:85-105`
Props: `titulo`, `subtitulo?`, `etiqueta?`, `class?` — Baixo / Baixo

### ⬜ P1.2 `BotaoExcluir` — `src/lib/components/ui/BotaoExcluir.svelte`

Padrão `<form method=POST>` + hidden input + Excluir + `confirm()` 5×, com **três assinaturas
diferentes** de `confirm()` no mesmo arquivo e estilos divergentes (`btn-xs` vs `btn-sm`,
`btn-error btn-ghost` vs só `btn-ghost`).
`apostilas/[apostilaId]/+page.svelte:122-124,257-271,352-359` ·
`anexos/+page.svelte:131-148` · `exercicios/+page.svelte:144-161`
Props: `acao`, `nomeId?`, `id?`, `rotulo?`, `confirmar`, `variante?`, `bloqueado?`,
`tituloBloqueado?`, `title?`, `classe?` — Baixo / Baixo

### ✅ P1.3 `ListaBlocos` — `src/lib/components/ListaBlocos.svelte`

> **Feito em 01/10/2026.** Props: `blocos`, `apostilaId?`, `baseHref?`, `aulaContexto?`,
> `class?` (padrão `space-y-3`). Migradas: `VisualizarConteudo`, `ImprimirConteudo` e as
> duas listas de `instrucoes` de `exercicios/[exercicioId]`.
> **Corrigido o bug latente**: a página do aluno passou a repassar
> `apostilaId={data.contexto.aula?.apostilaId}`, que já vinha no load
> (`contextoAtividade`). Sem `?aula=` na URL não há apostila e o link de aula não tem
> para onde apontar — aí `hrefLinkInterno` devolve `null` de propósito.
> Fora: `Apresentacao.svelte:132` renderiza **um** bloco por slide, não é lista.

`{#each blocos (bloco.id)} <BlocoRender/>` 4× e cada chamada precisa lembrar de repassar
`apostilaId`/`baseHref`/`aulaContexto`.
`VisualizarConteudo.svelte:70-74` · `ImprimirConteudo.svelte:54-57` ·
`exercicios/[exercicioId]/+page.svelte:135-139,186-190`
Props: `blocos`, `apostilaId?`, `baseHref?`, `aulaContexto?` — Baixo / Baixo
**Bônus:** corrige o achado 5 (link de aula quebrado nas instruções da atividade).

### ⬜ P1.4 `Contador` — `src/lib/components/ui/Contador.svelte`

Pluralização `n === 1 ? 'x' : 'xs'` escrita 6×, quase sempre com `badge badge-ghost`.
`routes/+page.svelte:47-49` · `apostilas/[apostilaId]/+page.svelte:48,244-246` ·
`anexos/+page.svelte:54-56,95-98` · `exercicios/+page.svelte:54-56,87-90,92-95,110-113`
Props: `n`, `singular`, `plural?`, `class?` — Baixo / Baixo

### ⬜ P1.5 `Botao` — `src/lib/components/ui/Botao.svelte`

~54 botões com classe montada à mão e tamanho inconsistente para a mesma ação ("Editar" é
`btn-sm` em `VisualizarConteudo.svelte:38` e `btn-xs` em
`exercicios/[exercicioId]/+page.svelte:100`). Também normaliza a ordem das classes, hoje
variando (`btn-ghost btn-xs` ×13 vs `btn-xs btn-ghost` ×7).

Props: `variante?: 'primary' \| 'outline' \| 'ghost' \| 'error'`,
`tamanho?: 'xs' \| 'sm' \| 'md'`, `class?`, `...rest` — Médio / Médio

> **Trade-off:** é o item com maior chance de virar um segundo design system paralelo à lib.
> Regra dura: só monta `btn {variante} {tamanho}`, tipa as variantes e repassa o resto — nenhuma
> propriedade visual nova. Casos raros continuam com `class` direto.

---

## P2

### ⬜ P2.1 `AlcaArrasto` — `src/lib/components/AlcaArrasto.svelte`

Alça `⠿` copiada 3×, com `aria-label` mudando de formato.
`apostilas/[apostilaId]/+page.svelte:234-242,312-320` · `EditorCanvas.svelte:298-306`
Props: `rotulo: string`, `class?` — Baixo / Baixo

### ⬜ P2.2 `AcoesConteudo` — `src/lib/components/AcoesConteudo.svelte`

Grupo "Editar + Imprimir/PDF + Apresentar" apontando para as mesmas 3 rotas, com 4 variações do
rótulo de impressão e "Ver" vs "Visualizar". Complementa `BarraAcoes` (que cuida do layout)
cuidando dos links.
`VisualizarConteudo.svelte:37-47` · `anexos/+page.svelte:121-130` ·
`exercicios/+page.svelte:136-143` · `exercicios/[exercicioId]/+page.svelte:100` ·
`apostilas/[apostilaId]/+page.svelte:330-350`
Props: `proprio`, `logado`, `mostrarApresentar?`, `tamanho?` — Baixo / Médio

> Os rótulos são contrato de E2E (`"Imprimir / PDF"`, `"Visualizar"`,
> `"Imprimir / salvar PDF"`). **Não renomear** ao extrair.

### ⬜ P2.3 `DataBadge` — `src/lib/components/ui/DataBadge.svelte`

`new Date(x).toLocaleDateString('pt-BR')` dentro de `badge badge-ghost text-xs shrink-0` 3×.
`routes/+page.svelte:40-42` · `anexos/+page.svelte:81-83` · `exercicios/+page.svelte:81-83`
Props: `valor: Date | string`, `class?` — Baixo / Baixo

### ⬜ P2.4 `CardConteudo` — `src/lib/components/ui/CardConteudo.svelte`

Esqueleto `li.card card-bordered p-4 space-y-2` (título+descrição + ações) nos painéis soltos
e no grid de apostilas.
`anexos/+page.svelte:73-84` · `exercicios/+page.svelte:73-84` · `routes/+page.svelte:34-50`
Props: `titulo`, `descricao?`, `acoes?`, `children?` — Baixo / Baixo

> Baixo ROI se P0.2 for feito primeiro (ele já cobre o cartão dos painéis). Avaliar depois.

### ⬜ P2.5 `SecaoBloco` — `src/lib/components/SecaoBloco.svelte`

`<span class="text-xs font-semibold uppercase tracking-wide opacity-60">` + borda, 3× como
rótulo dentro dos cards do editor.
`Exercicio.svelte:219-220` · `Dissertativa.svelte:63-64` · `EditorBlocoCamada.svelte:242`
Props: `rotulo`, `borda?`, `class?` — Baixo / Baixo

---

## P3 — refinamentos

### ⬜ P3.1 Estender `src/lib/icones.ts` (não é componente)

Ícones de ação são glifos Unicode soltos (`⠿` 3×, `✎`, `✕`, `×` 3×, `−`, `+`, `↗`), enquanto
`icones.ts` só tem os ícones de *tipo de bloco*. Em Windows o `⠿` e o `×` já aparecem com
fallback diferente do Linux.
Adicionar nomes a `FORMAS_ICONE` (`arrastar`, `editar`, `remover`, `fechar`, `externo`,
`mais`, `menos`) e trocar os glifos. — Baixo / Baixo

### ⬜ P3.2 `variante="slide"` no `Alternativa` (depois de P0.4)

`Apresentacao.svelte:113-121` é a alternativa de novo, em grid, com
`border-2 border-success text-success` em vez de `btn`. A variação visual é legítima
(slide ≠ formulário), mas o certo é um **prop** no `Alternativa`, não um segundo
componente. — Médio / Médio

### ⬜ P3.3 Mover `<style>` do editor para `app.css`

~190 linhas de CSS local: `EditorCanvas.svelte:381-454` (74), `TextoEditavel.svelte:150-198` (49),
`Mermaid.svelte:446-509` (64), com `:global()` atravessando fronteira
(`EditorCanvas.svelte:439`). Não é componente — o ganho é reuso/consistência, não abstração.
`TextoEditavel.svelte:155` usa multiplicador fixo sobre token do tema
(`calc(var(--rounded-box, 1rem) * 0.25)`). — Baixo / Baixo

### ⬜ P3.4 `Dialog` de confirmação (não recomendado agora)

`confirm()` nativo em 4 lugares não estiliza e não é acessível por teclado em alguns
ambientes. **Só vale se a decisão for trocar `confirm()`** — é mudança de comportamento, não
de UI. Risco alto para ganho pequeno. — Médio / Alto

---

## Não criar — e por quê

| Não criar | Justificativa |
| --- | --- |
| `Aviso` / `Alert` | As 23 ocorrências de `alert alert-*` **já são** a classe da lib em uma linha. Um wrapper trocaria `class="alert alert-error"` por `<Aviso tipo="erro">` sem ganhar aparência. O que precisa é **padronizar densidade** (`alert-error py-2 text-sm` ×4, `alert-info text-sm`), resolvido na classe, não no componente. |
| `Card`, `Modal`, `Table`, `Tabs` | Já existem como classe pura na lib (`.card`, `.modal`, `.table`, `.tabs`) e o projeto usa direto. Wrapper aqui duplica a lib. |
| `Grid`, `Flex`, `Stack`, `Espaco` | O projeto já usa `flex`/`grid`/`gap`/`space-y-*` direto. Um `Stack` seria camada sobre `gap`, que a lib já cobre. |
| `SecaoLista` | `apostilas/[apostilaId]/+page.svelte:291-365` é caso único (arrasto entre listas, renomeação inline, badge de contagem). Sem segundo consumidor. |
| `EditorTabela` | `EditorBlocoCamada.svelte:240-305` é a **única** edição de tabela do app; o outro lado (`BlocoRender.svelte:71-93`) é leitura pura. Extrair cria indireção sem segundo consumidor. |
| `ToolbarDiagrama` | `Mermaid.svelte:368-409` é único (zoom/ajustar). O layout já é coberto por `BarraAcoes`. |
| `AlternarModo` | `EditorConteudo.svelte:103-122` é toggle `join` usado uma vez. Se precisar evoluir, o natural é migrar para `.tabs` da lib. |
| `UploadArquivo` | `EditorBlocoCamada.svelte:69-87` é o único ponto de upload. Regra prática: extrair quando aparecer o **segundo** consumidor. |
| `NomeAluno` | `exercicios/[exercicioId]/+page.svelte:167-183` já é coberto por `Campo` (P0.5). |
| `CardSessao` | `exercicios/[exercicioId]/+page.svelte:108-132` tem identidade própria (nota, chave de integridade, impressão/PNG). Compor com `card` + `BarraAcoes` basta. |
| `ResultadoQuestao` | O feedback "Correto!/Incorreto" já entra no `Alternativa` (P0.4). Não precisa de terceiro nível. |
| Store/context de UI | Não há estado de UI compartilhado além do tema, já resolvido por `theme.svelte.ts` + `AHMAR` + o script anti-FOUC do `app.html`. |
| `Icone` (novo) | Já existe (`Icone.svelte` + `icones.ts`). Falta **adicionar nomes**, não criar componente (P3.1). |

---

## Ordem de execução

| Ordem | Item | Motivo |
| --- | --- | --- |
| 1º | **P0.1 `Pagina`** | 10 pontos, risco zero, resolve a inconsistência de `max-w` priorizada e remove um `px-4` redundante no app inteiro. |
| 2º | **P0.3 `BarraAcoes`** + rótulos em `$lib/conteudo.ts` | Mata a divergência de nomes/tamanhos que o E2E já fissurou em três strings. |
| 3º | **P0.5 `Campo`** | Padroniza 14 formulários e conserta os 2 labels sem `for`. |
| 4º | **P0.2 `PainelSoltos`** | Maior ganho de linhas (~110), com E2E cobrindo os dois lados. |
| 5º | **P0.4 `Alternativa`** | Único P0 com risco real. Fazer por último, com os E2E de exercício em cima. |
| 6º | **P1.3 `ListaBlocos`** | Aproveita a passagem para corrigir o link de aula quebrado nas instruções da atividade. |

**Ritmo:** incremental. Um item por vez, com `pnpm test`, `pnpm check` e a suíte E2E
completa antes do commit. P1–P2 só entram quando a tela correspondente for tocada por outro
motivo — não fazer refatoração speculativa.

**Rodada 01/10/2026 — P0 inteiro + P1.3 concluídos** (`pnpm test` 77/77, `pnpm check` 0,
E2E 34/34). Duas lições que valem para o resto do plano:

1. **`Campo` + `extra` não pode usar `.label`.** O padding horizontal da lib empurra o
   controle extra 8px para dentro e ele deixa de alinhar com a borda do campo — foi
   exatamente o que quebrou `fluxo.spec.ts:255-259` (mede a borda direita do select de
   tema do Mermaid). Com `extra`, a linha do rótulo é flex puro; sem `extra`, é `.label`.
2. **São três strings de impressão, não duas.** `ROTULO_IMPRIMIR` (link de contexto),
   `ROTULO_IMPRIMIR_PAGINA` (botão da página de impressão) e
   `ROTULO_IMPRIMIR_RESULTADO` (botão do cartão de resultado do aluno). Reaproveitar a
   constante errada quebra o E2E sem erro de tipo — o rótulo é contrato, não detalhe.

**Fica para quando a tela for tocada de novo:** P1.1, P1.2, P1.4, P1.5, P2.1–P2.5 e P3.x.
Em P0.2 vale revisar se o contador deve mostrar o total não filtrado
(`PainelSoltos` usa `itens.length`, que já vem filtrado das páginas).

**Convenção de pasta:** `src/lib/components/ui/` para as primitivas genéricas
(`Pagina`, `Campo`, `BarraAcoes`, `Botao`, `Contador`, `CardConteudo`, `DataBadge`);
componentes de domínio (`Alternativa`, `ListaBlocos`, `AlcaArrasto`) ficam ao lado dos
atuais.
