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
| **Props** | `singular`, `plural`, `descricao`, `rotuloCriar`, `rotuloBusca`, `rotuloVazio`, `nomeId`, `rotuloTipoExcluir`, `tituloSemUso`, `tituloEmUso` + snippets `marcadores` e `acoes` (a busca é interna desde 08/10/2026: sem props `busca`/`aoBuscar`) |
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

### ✅ P1.1 `CabecalhoPagina` — `src/lib/components/ui/CabecalhoPagina.svelte`

> **Feito em 03/10/2026.** Props: `titulo`, `subtitulo?`, `etiqueta?` (selo acima do
> h1), `children?` (ações à direita), `class?`. Migrados os **6** que cabiam:
> `routes/+page.svelte`, `apostilas/[apostilaId]` (ramo público), `VisualizarConteudo`,
> `EditorConteudo` (modo visualizar), `exercicios/[exercicioId]` (página do aluno) e
> `ui/PainelSoltos` — que agora repassa `titulo`/`descricao` em vez de ter markup próprio.
> **Quatro divergências resolvidas de uma vez**: o subtítulo era `text-sm opacity-70` em 2
> lugares e `opacity-80` em 4 (padronizou `opacity-80`), o selo aparecia em 3 dos 6, o
> alinhamento da ação era `items-center` no índice e `items-start` no `PainelSoltos`
> (padronizou `items-start`), e o "Editar" da atividade era `btn-xs` embaixo da
> descrição — virou `btn-sm` à direita do título, como nas outras telas.
>
> Ganho de paridade: o subtítulo ganhou `whitespace-pre-wrap`. Só a página do aluno tinha
> (e **precisa**: as instruções da atividade são texto com quebras de linha) — as outras
> cinco compactavam a descrição num bloco só. `getByText`/`toHaveText` do Playwright
> normalizam espaço, então nenhum contrato de E2E mudou.
>
> Duas decisões que só apareceram na implementação:
>
> 1. **`<h1>` e não `h2`**, e o selo **fora** do `h1`: as specs localizam o título por
>    `getByRole('heading', { level: 1 })` (`anexos.spec.ts:51,67,121,125`,
>    `fluxo.spec.ts:6,61`) e o nome acessível precisa continuar sendo só o título.
> 2. **A origem da atividade (`apostila › aula`) saiu do cabeçalho** e virou irmão acima
>    dele: é `nav`, não título. O custo é o vão passar de `space-y-2` para o `space-y-5`
>    da `Pagina` entre a origem e o cabeçalho — intentional, é o ritmo das outras telas.
>
> **Ficaram de fora (e por quê)**:
>
> | Fora | Motivo |
> | --- | --- |
> | `ImprimirConteudo` | A página de impressão tem *running head* em maiúsculas (não é selo) e uma `<hr>` embaixo do cabeçalho. Caberia só trocando o selo por badge e inventando uma prop para a régua — o doc proíbe estender a API para caber um caso. O `h1` e o subtítulo já usam as classes do componente, então a divergência visual é zero. |
> | `login/+page.svelte` | Não é `Pagina`: é card centralizado (`max-w-sm`) com escala própria (`text-2xl`). É tela de autenticação, não cabeçalho de página. |
> | `apostilas/nova/+page.svelte` | `h1` em `text-2xl` na largura `estreito` de criação: escala deliberada, não divergência. |

Par "badge + `<h1 class="text-3xl font-bold">` + subtítulo" 8× com hierarquias inconsistentes
(`space-y-1` vs `space-y-2`, badge antes ou depois do h1).
`routes/+page.svelte:12-16` · `apostilas/[apostilaId]/+page.svelte:169-176` ·
`VisualizarConteudo.svelte:51-57` · `ImprimirConteudo.svelte:43-52` ·
`EditorConteudo.svelte:224-232` · `exercicios/[exercicioId]/+page.svelte:85-105`
Props: `titulo`, `subtitulo?`, `etiqueta?`, `class?` — Baixo / Baixo

> **Contagem real (03/10/2026):** eram **7**, não 8 — `ui/PainelSoltos` ganhou um na
> extração do P0.2. Dos 7, 6 migraram (o 7º é a página de impressão), e há dois fora do
> plano original: `apostilas/nova` e `login` usam `text-2xl` (escala própria).

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

### ✅ P2.3 `DataBadge` — `src/lib/components/ui/DataBadge.svelte`

`new Date(x).toLocaleDateString('pt-BR')` dentro de `badge badge-ghost text-xs shrink-0` 3×.
`routes/+page.svelte:40-42` · `anexos/+page.svelte:81-83` · `exercicios/+page.svelte:81-83`
Props: `valor: Date | string`, `class?` — Baixo / Baixo
**Feito em 05/10/2026** como o slot `meta` do `CardConteudo` (P2.4); o plano já previa só 2
ocorrências depois do `PainelSoltos` e a contagem real era 4 com a volta da home.

### ✅ P2.4 `CardConteudo` — `src/lib/components/ui/CardConteudo.svelte`

Esqueleto `li.card card-bordered p-4 space-y-2` (título+descrição + ações) nos painéis soltos
e no grid de apostilas.
`anexos/+page.svelte:73-84` · `exercicios/+page.svelte:73-84` · `routes/+page.svelte:34-50`
Props: `titulo`, `descricao?`, `acoes?`, `children?` — Baixo / Baixo

> Baixo ROI se P0.2 for feito primeiro (ele já cobre o cartão dos painéis). Avaliar depois.

**Feito em 05/10/2026**, e com escopo maior que o do plano: as **quatro** listas de conteúdo
passaram a usar o mesmo cartão (apostilas na home, aulas no painel, anexos e atividades no
`PainelSoltos`). Props reais: `titulo`, `href?`, `descricao?`, `modo` (`lista`/`grade`),
`alca?` (arrasto), `meta?`, `marcadores?`, `detalhe?` (links reversos), `acoes?`, `class?` e
`rest?` (atributos repassados, é por ele que entra o `data-arrasto-item` do painel).

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

## Faixa de inserção de blocos (fora do plano, pedido pontual)

O grid de criação ficava só no fim da lista: numa aula grande, criar um bloco no meio
obrigava a rolar até o fim e voltar. Solução: **cada bloco carrega um botão flutuante na
sua borda de baixo** (no vão para o próximo) que aparece no hover e abre o mesmo grid
naquela posição. E, pela mesma razão, **o topo da lista tem a faixa equivalente** — sem
ela não dava para criar o bloco 0 (o grid do fim só insere abaixo do selecionado).

- `src/lib/components/CriadorBloco.svelte` (novo): o grid de `TIPOS_BLOCO` com 10 botões,
  usado nos três lugares. `rotuloGrupo` continua "Adicionar bloco" no fim (contrato de
  `fluxo.spec.ts:409`) e é "Tipos de bloco" na faixa — o `getByRole` do Playwright casa
  por substring, então o nome da faixa não pode conter "Adicionar bloco".
- `e2e/inserir-bloco.spec.ts` (novo, 7 testes): hover sem mexer no layout, inserção na
  posição ignorando a seleção, `Esc`/clique fora, o grid do fim ainda funcionando, a faixa
  do topo criando o bloco 1 (com ida e volta ao salvar) e a mesma faixa em anexo e
  atividade.

Cinco decisões que só apareceram na implementação:

1. **O botão fica dentro do bloco, não como irmão na lista.** Como irmão, cada vão
   ganhava o `space-y-4` duas vezes (+1rem por vão) — o problema que a faixa existe
   para resolver. Absoluto na borda de baixo, não entra no fluxo.
2. **`svelte:window` no `onclickcapture`, não no `onclick`.** O clique no botão já troca
   o `{#if}` e tira o botão do DOM; no `onclick` comum o `event.target` fica solto e o
   `closest` volta `null`, e a faixa abre e fecha no mesmo clique. `composedPath()` é a
   rede de segurança (o caminho do evento é fixo no dispatch).
3. **`focusin` do bloco ignora o botão da faixa.** Focá-lo selecionava o bloco, a camada
   de configuração abria, o bloco crescia e o `pointerup` caía fora do botão — o clique
   nunca acontecia. Só apareceu no E2E, e é o bug mais chato dos quatro.
4. **A âncora da faixa é o id do bloco de cima**, não o índice: a inserção continua
   correta se a lista mudar enquanto a faixa está aberta. O último bloco não tem faixa
   (para o fim da lista responde o grid do fim) e, sem hover (`@media (hover: none)`), o
   botão some e o grid do fim segue sendo o caminho do toque.
5. **A faixa do topo não tem `article` para morar dentro nem bloco para ancorar.** Ela é
   filho direto do canvas, também absoluto (`top: -1.05rem`), e quem se revela no hover é
   o próprio botão (`.canvas-inserir-btn:hover`) — `opacity: 0` continua clicável, então
   não precisa de bloco-pai. A âncora no `insercaoAberta` é a sentinel `INICIO` (id de
   bloco é UUID, não colide) e a inserção usa o id do bloco de baixo, com índice 0 como
   reserva caso ele suma com a faixa aberta. Mesma regra do fim: **sem nenhum bloco a
   faixa do topo não existe** (o grid do fim cria o primeiro). Vale para aula, anexo e
   atividade, porque os três usam o mesmo `EditorCanvas`.

---

## Bloco de texto em markdown (fora do plano, pedido pontual)

O bloco `texto` era `whitespace-pre-wrap` sobre a string crua: o professor digitava no
`contenteditable` e o aluno lia exatamente a mesma coisa. Agora o `conteudo` é **markdown** —
mesma coluna, mesmo formato, zero migration — e a leitura sai formatada por
`src/lib/markdown.ts` (`marked` no servidor + KaTeX). Markdown é superseto do texto solto,
então todo bloco antigo continua igual na tela.

- `src/lib/markdown.ts` (novo): `markdownParaHtml()`. HTML bruto escapado na fonte (o
  professor escreve markdown, não HTML), `breaks: true` (a quebra de linha do texto puro
  precisa continuar valendo), `$...$`/`$$...$$` no SSR pela convenção de `$lib/matematica`,
  e link/imagem só com URL segura — o `marked` não filtra `javascript:` no `href`.
- `src/lib/components/TextoMarkdown.svelte` (novo): o `{@html}` — **único do app**, e o CSS
  é o único lugar que teve que ir para o `app.css` porque dentro do `<style>` do componente
  cada seletor precisaria de `:global()`. `.markdown` não é classe do ahmardesign, então é
  o mesmo caso do P3.3 (232 linhas de `<style>` local virando utilitário de `app.css`).
- `src/lib/components/EditorTextoMarkdown.svelte` (novo): `textarea` + barra de formatação
  (negrito, itálico, código, lista, lista numerada, citação, linha horizontal, link) e
  atalhos Ctrl+B/I/K. `TextoEditavel.svelte` continua sendo o editor do bloco `titulo`.

Decisões e armadilhas que só apareceram na implementação:

1. **`setRangeText`, não `value = …`.** É o que entra no undo do navegador: Ctrl+Z desfaz a
   formatação. O `input` é disparado à mão para o canvas gravar, e o pai devolve o mesmo
   valor, então o Svelte não reescreve o DOM e o caret não pula no meio da digitação.
2. **A barra só aparece com o bloco em edição**, como a camada de configuração. Botão
   `mousedown` com `preventDefault()` para o `textarea` não perder a seleção ao clicar.
3. **`toHaveValue`, não `toHaveText`, nos E2E de texto.** O valor do `textarea` vive na
   propriedade, não no `textContent`; `arrastar.spec.ts` lê a ordem dos blocos com
   `evaluateAll` + `expect.poll` (`toHaveValues` é assertion de `<select multiple>`) e aceita
   os dois estados do bloco (campo em edição ou prévia `.markdown`).
4. **`normalizarCamposBloco` ganhou `case 'texto'` só para o `\r`.** Indentação é sintaxe em
   markdown (código cercado, lista aninhada), então normalizar o texto não pode ser `trim`.
5. **Limitação aceita:** `` `$x$` `` dentro de código inline vira fórmula, porque a extensão
   inline do `marked` roda antes do tokenizador de código. Para LaTeX cru, usar ``` cercado.
6. **Sem ação de Título na barra.** Heading é bloco próprio (`cabeçalhos`), e o markdown ainda
   aceita `#` normalmente — botão seria um segundo caminho para a mesma coisa.
7. **Lista e linha horizontal não substituem a seleção.** `envolver` mantém o texto
   selecionado (é o que permite negrito e depois itálico); `prefixar`/`inserirLinha` colapsam
   o caret no fim do trecho, senão a ação seguinte apaga o que foi escrito.

**Rodada 04/10/2026** — `e2e/markdown.spec.ts` (novo, 10 testes) e o bloco `texto` virando
markdown: `pnpm test` 94/94, `pnpm check` 0, E2E 51/51, `pnpm build` ok,
`pnpm db:generate` sem mudança de schema (estado da rodada; a rodada (4) atualiza para 96/52).

**Rodada 04/10/2026 (3)** — barra de formatação **grudada no topo da tela**
(`sticky top-0 z-10` + `bg-base-100` + `shadow-sm`): o bloco rola junto com a página, então
sem `sticky` a barra some junto com o topo dele no meio da edição. Só dá para usar porque
nenhum ancestral corta o `sticky` (o `.card` da lib tem `overflow: hidden`, mas o canvas fica
fora dele e o `.canvas-bloco` não tem `overflow`) — é o mesmo tipo de armadilha do
`.canvas-acciones` absolute. Sem CSS local: só classes da lib. E2E novo em
`e2e/markdown.spec.ts` confere a geometria (`boundingBox().y <= 1` depois de rolar 700px),
porque `toBeInViewport` sozinho passaria com a barra ainda no lugar.

**Rodada 04/10/2026 (2)** — prévia do bloco de texto: fora da edição o bloco mostra a
mesma leitura do aluno (`TextoMarkdown.svelte` dentro de um `div role="button"`, `aria-label`
`Editar texto`), e o clique volta a editar com o cursor no fim.

O ponto que consumiu a rodada: **a troca editor → prévia muda a altura do bloco, então ela
não pode acontecer no meio de um clique.** O `mousedown` no botão (Salvar, mover bloco…)
tira o foco do campo, o bloco encolhe ~80px, o `mouseup` cai fora do botão e o `click` não é
nem disparado — o formulário não submetia e o Playwright só dava timeout. Três armadilhas
resolvidas, não reintroduzir:

1. A saída por `focusout` fica **adiada enquanto o ponteiro estiver pressionado**
   (`svelte:window` com `pointerdown`/`pointerup`), e o `setTimeout(…, 0)` acontece depois
   do `click`, quando a ação do botão já rodou.
2. O `cliqueFora` no `window` cobre o clique em área que não recebe foco, e precisa do
   `composedPath()` — o botão pode ter saído do DOM no mesmo clique.
3. `abrindo` descarta o `cliqueFora` do **mesmo** clique que abriu o editor: como o Svelte
   atualiza o DOM no microtask entre os listeners, o clique que criou o bloco chega no
   `window` com o editor já montado e fecharia na mesma hora.

**Rodada 04/10/2026 (4)** — bloco `titulo` com **H1–H6 e o nível por botões**: o
`select` "Nível" (H1/H2/H3) da camada de configuração virou seis `btn btn-xs` num `join`,
com `role="group"`, `aria-label` `Nível do título` e `aria-pressed` no atual.

Decisões:

1. **Botão, não `select`.** São 6 valores fixos que cabem na linha; o `select` escondia os
   3 níveis atrás de dois cliques. Mesmo padrão do seletor de modo do editor (`join` +
   `aria-pressed`), então não é um widget novo — é o padrão já usado duas vezes.
2. **`tooltip` da lib com `data-tip="Título N"`.** "H1" sozinho é críptico e o botão não
   cabe com o nome por extenso; o tooltip explica sem `title` nativo (que duplicaria o
   balão do browser). O texto do `::before` **não entra no nome acessível**, então
   `getByRole('button', { name: 'H4' })` continua casando — e o E2E confere os `data-tip`
   com `evaluateAll`, já que `toHaveAttribute` num locator de 6 elementos dá strict violation.
3. **Bloco novo nasce em H1** (`criarBloco`), não em H2: H2 era resquício do select de
   3 níveis, e título recomeçando a hierarquia no meio é o caso comum. Só muda bloco novo —
   o que já está salvo no banco mantém o nível.
4. **`NIVEIS_TITULO` em `blocks.ts` é a lista valida**, com `NivelTitulo` derivado dela e
   `ehNivelTitulo` no `ehBloco`: nível fora de 1–6 descarta o bloco (campo obrigatório), então
   o `Record<NivelTitulo, …>` dos mapas de classe é exaustivo por tipo.
5. **`svelte:element this={\`h${nivel}\`}`** nos três lugares (`TextoEditavel`,
   `BlocoRender`, `Apresentacao`) em vez de um `{#if}` por nível. No editor o elemento
   continua `contenteditable`, e `bind:this` + o efeito que escreve `texto` no DOM
   reposicionam o texto no elemento novo quando a tag muda.
6. **`role="heading"` + `aria-level={nivel}` no `TextoEditavel`**: o linter não tem tag
   estática para inferir o papel do `svelte:element` e cobra `a11y_no_static_element_interactions`.
7. **Escala por nível em três mapas** — `TITULO_CLASSE` (leitura), `TITULO_APRESENTACAO`
   (slide, maior) e `.canvas-titulo-{1..6}` (editor). O editor espelha a leitura para o
   bloco não pular de tamanho ao sair da edição; H6 desce a `text-sm`/`uppercase` porque
   abaixo de `text-base` o heading fica ilegível.
8. **`rotulo="Editar título"` no `TextoEditavel` do bloco de título.** O default é
   `Texto do bloco`, e três E2E que clicavam no título casavam por ele
   (`inserir-bloco.spec.ts` ×2, `fluxo.spec.ts` na criação pelo grid); agora casam por
   `Editar título`, que é o mesmo rótulo da prévia do bloco de texto (`Editar texto`).
   Consequência de a11y: **no canvas o nome acessível do heading é `Editar título`, não o
   texto**, então E2E que conferem o texto do título em edição têm de casar pela tag
   (`locator('h4')`), não por `getByRole('heading', { name })`.

`pnpm test` 96/96, `pnpm check` 0/0, E2E 52/52, `pnpm build` ok, `pnpm db:generate` sem
mudança de schema.

---

## Bloco de simulação p5/q5 (fora do plano, pedido pontual)

Novo tipo de bloco `simulacao` (`biblioteca: 'p5' | 'q5'`, `codigo`, `altura`): código de
simulação roda **no navegador do aluno**, dentro de uma `iframe` isolada, sem passar pelo
servidor. JSON na coluna `blocos`, zero migration.

- `src/lib/components/Simulacao.svelte` (novo): editor (textarea + seletor de biblioteca +
  altura + botão Rodar) e leitura a partir do mesmo componente, com prévia ao vivo.
- `src/routes/lib/[...caminho]/+server.ts` (novo): serve `p5.min.js` e `q5.js` do
  `node_modules`, por allowlist. Sem CDN — o deploy funciona offline e o código do aluno
  não depende de terceiro. Rota **pública**: o aluno lê sem login, e a sessão não é
  necessária para um arquivo de biblioteca.
- `BlocoRender.svelte` ganhou `modo="imprimir"` (repasse de `ListaBlocos`, usado por
  `ImprimirConteudo`): só a simulação distingue impressão de leitura, os outros blocos
  recebem `visualizar`.

Decisões e armadilhas que só apareceram na implementação:

1. **`sandbox="allow-scripts"` sem `allow-same-origin`.** A origem opaca é o que isola o
   código do aluno da sessão, do DOM e do localStorage da página. Consequência: a iframe não
   enxerga o tema, então a cor de fundo do canvas vai **por `postMessage`**
   (`getComputedStyle(document.body)` no pai).
2. **O código do professor nunca entra no `srcdoc`.** Chega por `postMessage` e é injetado
   com `script.textContent` — é assim que `setup`/`draw` viram função no `window`, que é o
   que as duas libs exigem para o **modo global** (`new Function` deixaria a declaração no
   escopo local e a lib não acharia nada). Bônus: não existe tag de script do professor
   para escapar dentro do arquivo.
3. **O código entra ANTES da lib no bootstrap.** As duas libs se instanciam sozinhas quando
   encontram `setup`/`draw`, mas isso acontece em `Promise`/`setTimeout` depois do script
   carregar: quem disparasse a instância no `onload` da lib perderia a corrida e o bloco
   ficaria em branco. O bootstrap ainda instancia na mão (`p5.instance`/`Q5._hasGlobal`)
   como rede de segurança, se a versão instalada deixar de hacerlo sozinha.
4. **Reexecutar = `{#key}` nova, não reinstanciar.** p5 guarda `p5.instance` e q5
   `Q5._hasGlobal`: só um `document` novo roda o código de novo. A lib continua vindo do
   cache do HTTP (a rota `/lib` manda ETag e responde 304), não da rede.
5. **Debounce de 700 ms no editor e 0 na leitura.** Sem debounce, cada tecla recriaria a
   moldura e recarregaria a lib (~1 MB no p5); na leitura não há digitação, então a
   simulação do aluno abre rodando.
6. **Impressão mostra o código, não o canvas** (canvas não sai no papel) — e o bloco
   `codigo` da lib não serve como leitura do aluno, porque o aluno não tem a lib carregada
   na página dele.
7. **Trocar a biblioteca troca o exemplo junto só se o código ainda for o exemplo.** Código
   já editado é do professor e fica intacto.
8. **A UI limita a altura (120–900) em vez de recusar**, com `min`/`max` no input: com 1200
   digitado o campo volta para 900, em vez de deixar o número na tela e o bloco com o valor
   antigo. `ehAlturaSimulacao` valida o que vem do POST, no servidor.
9. **`simulacao` não herda campo nenhum na troca de tipo** (`preservaDado` no
   `EditorCanvas`): o `codigo` da simulação é um sketch p5/q5, então puxar o de um bloco
   `Código` (um script em Python, por exemplo) trocaria o bloco sem nem avisar e entregaria
   um desenho quebrado. Na volta (simulação → Código) o sketch vira snippet normalmente.
10. **`simulacao` precisa entrar em `TIPOS_VALIDOS`** (`blocks.ts`), senão `ehBloco`
    descarta o bloco inteiro no POST e a simulação nunca sobrevive ao Salvar. O unit
    ("aceita o bloco do POST…") foi o que pegou isso.
11. **Código e visualização lado a lado no topo, configurações numa linha abaixo**
    (`grid lg:grid-cols-2 items-start`). Os dois lados vão em `Campo` para terem a mesma
    linha de rótulo — e o da visualização precisa de `id` **na própria `iframe`**: sem ele o
    `Campo` renderiza `<span class="label-text">` em vez de `<label for>`, e a linha fica
    3px menor, o que desalinha o topo da caixa com o topo do `textarea`. `iframe` é
    elemento rotulável, então o `for` é válido e clicar no rótulo foca a moldura.
12. **Sem badge de "rodando"** (e sem a mensagem `rodou` do protocolo): o canvas rodando já
    é a informação, e o retângulo sobre o desenho só ocupava espaço. O que volta da iframe é
    só o erro.
13. **Toggle de face no próprio bloco**: `join` de 2 botões (`role="group"`, rótulo "Modo da
    simulação", `ROTULO_EDITAR`/`ROTULO_VISUALIZAR`) no topo à direita. "Visualizar" mostra a
    **face do aluno** — a própria leitura, mesmo markup, sem código e sem configurações —, que
    o "Visualizar" da página não serve porque joga fora a edição de todos os blocos. O `join` é
    o mesmo do seletor de modo do `EditorConteudo`.
14. **O canvas é do tamanho da caixa, não do código**: o bootstrap da casca chama
    `resizeCanvas(window.innerWidth, window.innerHeight)` na instância (`p5.instance` /
    `Q5.instances[0]`) assim que a lib instancia e em cada `resize` da moldura (campo
    Altura), com `setInterval` de 50 ms por até 3 s para cobrir a corrida de instanciação. Sem
    isso o `createCanvas(420, 260)` do professor continuava 420 px e o CSS só esticava a
    imagem — **upscale**, que é exatamente o desenho desfocado que o professor reclamou na
    visão final. Redimensionando o buffer, a simulação sai nítida em qualquer largura e a
    prévia do professor e a tela do aluno mostram o mesmo desenho (*what you see is what you
    get*). O `canvas { width: 100% !important; height: 100% !important }` do CSS da casca é
    só a rede de segurança do instante antes da primeira instância.
15. **Pegadinha de escopo na casca**: `ajustar()` recebe `dados` e lê `dados.biblioteca` —
    chamar `ajustar(biblioteca, dados)` com um `biblioteca` que não existe no escopo do
    handler mata o `message` com `ReferenceError` **depois** do `appendChild` da lib: o
    sketch roda, o bloco parece funcionar, e só o resize nunca é registrado. Foi o que
    manteve o bug do desenho desfocado vivo depois da primeira tentativa de corrigi-lo.
16. **Dublê de `localStorage`/`sessionStorage` na casca** (logo no início do script, antes
    da lib): as duas libs tocam armazenamento no start-up — o q5 monta `storeItem`/`getItem` no
    construtor, o p5 sonda `localStorage` para o i18next — e o *getter* lança em documento
    sandboxed sem `allow-same-origin` ("Forbidden in a sandboxed document"). Sem o dublê o q5
    morre no primeiro frame e sobra o canvas padrão de 200x200 esticado pelo CSS. A origem
    opaca é de propósito, então a resposta é `Object.defineProperty` no `window` com
    implementação em memória; os métodos são **não enumeráveis** porque o `clearStorage` do p5
    percorre `Object.keys(localStorage)` e não deve achar os próprios métodos. A moldura é
    recriada a cada execução, então não há nada a persistir.
17. **E2E que prova rodou, não que existe** (`trocar p5 por q5…`): `Q5.instances.length > 0` é
    o sinal de que o construtor do q5 não morreu, e o `poll` do `buffer >= largura` é o sinal de
    que a instância reagiu ao tamanho da caixa, que é o que prova que o esizeCanvas pegou. Os dois juntos pegam a regressão; o
    `toHaveCount(0)` do alerta sozinho **não pega**, porque logo depois de `selectOption` a
    moldura antiga (p5, sadia) ainda está na tela e o debounce de 700 ms não deu tempo do q5
    aparecer. É a mesma armadilha de medir antes da troca.

**Rodada 04/10/2026** — `e2e/simulacao.spec.ts` (novo, 7 testes: prévia rodando com o
`canvas` ocupando a largura da moldura, `sandbox` sem `allow-same-origin`, erro de runtime no
código e volta a rodar depois do conserto, troca p5 → q5 com o exemplo junto, alinhamento do
layout e ausência do badge, toggle da face do aluno, altura, e leitura + impressão). O E2E entra
no mesmo `canvas` **dentro da iframe** (`frameLocator`), o que prova que a lib carregou e o modo
global pegou, e não só que a `iframe` existe; e `medidas()` compara a caixa do `canvas` com a da
moldura **e** o atributo `width` (o buffer) com a largura exibida — `buffer >= largura` é o que
distingue desenho nítido de upscale, então é a asserção que pega regressão de nitidez. Um teste
também lê o pixel do canto com `getImageData` para provar que o código salvo rodou.

---

## Não criar — e por quê

| Não criar | Justificativa |
| --- | --- |
| `Aviso` / `Alert` | As 23 ocorrências de `alert alert-*` **já são** a classe da lib em uma linha. Um wrapper trocaria `class="alert alert-error"` por `<Aviso tipo="erro">` sem ganhar aparência. O que precisa é **padronizar densidade** (`alert-error py-2 text-sm` ×4, `alert-info text-sm`), resolvido na classe, não no componente. |
| `Card`, `Modal`, `Table`, `Tabs` | Já existem como classe pura na lib (`.card`, `.modal`, `.table`, `.tabs`) e o projeto usa direto. Wrapper aqui duplica a lib. |
| `Grid`, `Flex`, `Stack`, `Espaco` | O projeto já usa `flex`/`grid`/`gap`/`space-y-*` direto. Um `Stack` seria camada sobre `gap`, que a lib já cobre. |
| `SecaoLista` | `apostilas/[apostilaId]/+page.svelte:291-365` é caso único (arrasto entre listas, renomeação inline, badge de contagem). Sem segundo consumidor. **Resolvido por outro caminho em 05/10/2026**: o cartão virou `CardConteudo` (P2.4) e a barra de contagem/visão ficou igual nas quatro listas. |
| `EditorTabela` | `EditorBlocoCamada.svelte:240-305` é a **única** edição de tabela do app; o outro lado (`BlocoRender.svelte:71-93`) é leitura pura. Extrair cria indireção sem segundo consumidor. |
| `ToolbarDiagrama` | `Mermaid.svelte:368-409` é único (zoom/ajustar). O layout já é coberto por `BarraAcoes`. |
| `AlternarModo` | `EditorConteudo.svelte:103-122` é toggle `join` usado uma vez. Se precisar evoluir, o natural é migrar para `.tabs` da lib. |
| `UploadArquivo` | `EditorBlocoCamada.svelte:69-87` é o único ponto de upload. Regra prática: extrair quando aparecer o **segundo** consumidor. |
| `NomeAluno` | `exercicios/[exercicioId]/+page.svelte:167-183` já é coberto por `Campo` (P0.5). |
| `CardSessao` | `exercicios/[exercicioId]/+page.svelte:108-132` tem identidade própria (nota, chave de integridade, impressão/PNG). Compor com `card` + `BarraAcoes` basta. |
| `ResultadoQuestao` | O feedback "Correto!/Incorreto" já entra no `Alternativa` (P0.4). Não precisa de terceiro nível. |
| Store/context de UI | Não há estado de UI compartilhado além do tema, já resolvido por `theme.svelte.ts` + `AHMAR` + o script anti-FOUC do `app.html`. **05/10/2026**: entrou `visao.svelte.ts` (lista/grade) com o mesmo desenho do tema, sem FOUC e sem script no `app.html`. |
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

**Rodada 03/10/2026 — P1.1 `CabecalhoPagina` concluído** (`pnpm test` 77/77, `pnpm check` 0,
E2E 41/41, `pnpm build` ok). Antes de codar, as contagens do plano foram **re-verificadas** e
várias mudaram depois das extrações anteriores — o número entre parênteses é o de hoje:

| Item | Plano | Real | Situação |
| --- | --- | --- | --- |
| P1.1 `CabecalhoPagina` | 8 | **7** | ✅ feito (6 migrados; impressão fora) |
| P1.2 `BotaoExcluir` | 5 | **4** | o `PainelSoltos` eliminou os 2 de anexo/atividade |
| P1.4 `Contador` | 6 | **5** | 2 já dentro do `PainelSoltos` (5 de UI) |
| P1.5 `Botao` | ~54 | **76** | 7 não cabem (têm `class:` condicional) |
| P2.1 `AlcaArrasto` | 3 | 3 | `title` igual nos 3, `aria-label` em 3 formatos |
| P2.2 `AcoesConteudo` | 5 | 5 | sobraram 2 literais fora das constantes: `"Ver"` e `"PDF"` |
| P2.3 `DataBadge` | 3 | **2** | o padrão já unificado no `PainelSoltos` |
| P2.4 `CardConteudo` | 3 | **0** | os 2 que sobram não compartilham esqueleto → fechar |
| P2.5 `SecaoBloco` | 3 | **6** | 4 veículos (`span`, `legend`, `div`, prop) → virar **classe** em `app.css`, não componente |
| P3.1 glifos | ~7 | **22** | `×` U+00D7 ×3 e `✕` U+2715 ×1 são o mesmo "remover" com fallback de fonte diferente |
| P3.3 `<style>` | 190 | **232** | 4 `:global()` atravessando fronteira |

**Ordem sugerida a partir daqui:** P2.1 `AlcaArrasto` (+ o `⠿` do P3.1, uma passada só) →
P1.4 `Contador` → P1.2 `BotaoExcluir`. **P1.5 `Botao` e P2.2 `AcoesConteudo` só quando a
tela for tocada por outro motivo**: o `Botao` é o item com mais chance de virar design system
paralelo, e o `AcoesConteudo` depende de decidir o que fazer com `"Ver"`/`"PDF"` (renomear
quebra contrato de E2E).

**Fica para quando a tela for tocada de novo:** P1.2, P1.4, P1.5, P2.1–P2.5 e P3.x.
O contador do P0.2 foi resolvido em 08/10/2026: a barra mostra o **filtrado** e a
mensagem de vazio usa o **total real** (duas contagens — ver a rodada do fim do doc).

**Convenção de pasta:** `src/lib/components/ui/` para as primitivas genéricas
(`Pagina`, `Campo`, `BarraAcoes`, `CabecalhoPagina`, `Botao`, `Contador`, `CardConteudo`,
`DataBadge`, `SeletorVisao`); componentes de domínio (`Alternativa`, `ListaBlocos`,
`AlcaArrasto`) ficam ao lado dos atuais.

---

## Rodada 05/10/2026 — listas de conteúdo padronizadas + visão lista/grade

Pedido pontual (as quatro listas de conteúdo eram diferentes entre si) que acabou entregando
P2.3 e P2.4 do plano. `pnpm test` 105/105, `pnpm check` 0/0, E2E 65/65, `pnpm build` ok.

- **`CardConteudo`** (P2.4) é o cartão das **quatro** listas: apostilas na home, aulas no painel
  da apostila, e os dois `PainelSoltos` (anexos e atividades). `PainelSoltos.svelte` saiu de 172
  para 179 linhas, mas as ~110 duplicadas entre anexo e atividade continuam eliminadas e agora
  o cartão do painel da apostila também é o mesmo.
- **`SeletorVisao`** + **`src/lib/visao.svelte.ts`**: alternância lista/grade em todas elas, para
  aluno e professor (a home é pública, então a preferência é do navegador, não da sessão).
  `role="group"` "Modo de visualização", `join` de dois `btn btn-xs` com `aria-pressed` — o mesmo
  desenho do seletor de nível do título e do "Modo da simulação".
- **`DataBadge`** (P2.3) como slot `meta` do cartão.
- **`CabecalhoPagina` com `ml-auto` no grupo de ações**: era o bug reportado.

Decisões e armadilhas:

1. **O cartão é `<a>` ou `<li>` conforme tenha ações.** Botão dentro de link é HTML inválido, então
   sem ações o cartão inteiro é o link (é o caso da home, que só navega) e o container é `div`;
   com ações o cartão é `li` e o container é `ul`. Componente que fixasse uma das duas tags
   obrigaria a escolher entre link de cartão inteiro e link só no título — o `li` do painel
   solto ainda é contrato de E2E (`anexos.spec.ts` e `exercicios.spec.ts` fazem
   `locator('li', { hasText })`).
2. **`ul` com `display: grid` é válido**, então `classeLista()` (`space-y-2` → `grid gap-4
   sm:grid-cols-2`) serve para os dois modos sem trocar o container e sem duplicar o cartão.
   Descrição ganha `line-clamp-2` na grade (cabe no cartão) e fica inteira na lista.
3. **O snippet do `CardConteudo` não pode ter o mesmo nome da prop que ele preenche.** No
   `PainelSoltos` o `{#snippet acoes()}` do cartão recebe o nome da prop `acoes`, então
   `{@render acoes(item)}` dentro dele seria auto-referência: o conteúdo vem por um apelido
   `acoesItem = $derived(acoes)`. O `svelte-check` pegou (`does not exist in type 'Props'`).
4. **Arrasto continua funcionando na grade**: `data-arrasto-lista` fica no `<section>` do grupo e
   o `ul` dos cartões vem dentro dele — `arrastar.ts` acha a lista com `closest()` e os itens com
   `querySelectorAll`, então aninhar não muda nada. `e2e/arrastar.spec.ts` ganhou o teste da
   grade justamente para isso.
5. **`btn-active` no botão da visão ativa** (além do `aria-pressed`): sem ele o estado não aparece
   em nenhum tema — os `btn` do `join` não se distinguem visualmente.
6. **A coluna do `CardConteudo` não tem `data-*` de teste.** O E2E de visão localiza por estrutura
   real (`main a.card`, `section[data-arrasto-lista] ul > li`) e compara caixas, o que também
   pega layout quebrado, não só classe trocada.
7. **O botão à direita se mede contra a borda do conteúdo** (`getBoundingClientRect` do
   `.container` menos o `padding-right`): comparar com outro elemento da linha seria frágil
   porque o seletor de visão não existe quando a lista está vazia.

---

## Rodada 08/10/2026 — busca por título nas quatro listagens + cabeçalho sem `flex-wrap`

Pedido pontual com três partes, todas com E2E novo (`e2e/busca.spec.ts`, 3 testes) e o teste
do botão do `visao.spec.ts` reescrito. `pnpm test` 105/105, E2E 68/68, `pnpm check` 0/0,
`pnpm build` ok.

- **`CabecalhoPagina` sem `flex-wrap`**: `flex flex-nowrap`, coluna de título `min-w-0 flex-1`
  (`h1` com `break-words`) e ações `ml-auto flex shrink-0`. Com descrição longa o botão nunca
  cai para a linha de baixo nem é empurrado à esquerda. O teste do `visao.spec.ts` agora espera
  `|y(botão) − y(título)| ≤ 8px` junto da borda direita.
- **Busca por título** nas quatro listagens, `type="search"` na barra de contagem com
  `aria-label` "Buscar X por título". No `PainelSoltos` o filtro é **interno** (state
  `$state`/`$derived`); as props `busca`/`aoBuscar` saíram das duas páginas soltas.
- **Duas contagens** (o P0.2 pendente): o total real decide a mensagem de vazio e o filtrado
  decide a contagem + o alert "Nada encontrado para X". Antes só havia a lista já filtrada,
  então o alert **nunca disparava** — e a mensagem de vazio real aparecia com o total cheio.
- **Rótulo de criação padronizado como `+ Nome`** (texto, não ícone): o `getByRole` do
  Playwright casa por substring, então rótulos sem `+` nos specs continuam válidos.

Decisões e armadilhas:

1. **No painel da apostila a busca esconde a alça de arrasto** e `moverAula` tem guarda
   `if (busca.trim()) return` — salvar a ordem por uma lista filtrada mandaria só o pedaço
   visível e renumeraria o resto. O agrupamento (`agruparPorSecao`) já descarta grupos vazios,
   então `visiveis` pode alimentá-lo direto.
2. **O cartão de aula no painel não é link** (as ações levam para a aula), então o E2E checa
   com `toContainText`, não `toHaveAttribute('href')`.
3. **Atividade sem bloco de exercício/dissertativa não salva**: a action `?/salvar` devolve
   `fail(400)` (não redireciona), então o E2E que cria a atividade precisa de uma dissertativa
   antes de apertar "Salvar atividade" — sem isso o título nunca persiste e a busca falha.
4. **Contagem absoluta na home é frágil**: as specs dividem o mesmo DB (reset por run), então
   o teste usa token `Date.now()` na criação em vez de contar cartões globais.
5. **O `ApostilaComTotal` do load root** precisou de import de tipo na home: sem anotação o
   `svelte-check` acusava implicit any no `.filter()`.

---

## Rodada 08/10/2026 — Quiz (novo conteúdo solto)

Quarto conteúdo solto (`/quiz`, estilo Kahoot) com sala ao vivo por polling. `pnpm test`
121/121, E2E 75/75, `pnpm check` 0/0, `pnpm build` ok, `pnpm db:generate` sem mudança.

- **Componente de domínio novo: `src/lib/components/EditorQuiz.svelte`** (fica plano, ao lado de
  `EditorConteudo`/`VisualizarConteudo`). Reaproveita `Pagina`, `BarraAcoes` e `Campo`; não é
  wrapper de design system. Usa a cópia inicial por `valorInicial()` (mesmo padrão do
  `EditorConteudo`) para silenciar o `state_referenced_locally` do Svelte 5.
- **Sem componente novo para alternativas**: host e aluno são só 2 ocorrências (o limiar do
  plano é 3+), então o markup fica inline nas páginas, com as cores por `btn-error/info/warning/success`
  (classes da lib, não hex) e o gabarito destacado só na revelação.
- **Nenhuma classe local de CSS**: a sala, o placar e o ranking usam só classes da lib
  (`card`, `btn`, `badge`, `alert`, `progress`) e utilitários.

---

## Rodada 09/10/2026 — feedback de envio padronizado (`use:enviando`)

Pedido pontual ("padronizar tudo"): toda ação de escrita dá sinal visual de que está rodando,
sem reload. `pnpm test` 144/144, `pnpm check` 0/0, E2E 79/79, `pnpm build` ok.

- **`src/lib/enviando.ts` (novo)**: Svelte action `use:enviando`. **Não é componente** — é uma
  action, então fica em `src/lib/`, não em `components/ui/`. Embute o `enhance` e, enquanto a
  action roda, marca todos os `button[type="submit"]` do form com `disabled` + `btn loading`
  (classe da lib) + `aria-busy`. Ao voltar o resultado, solta os botões e trata o `ActionResult`.
- **Opções**: `confirmar?: () => boolean` (devolve `false` para cancelar o envio),
  `sucesso?: (resultado) => void` e `aoResultado?: (ctx) => void`.
- **20 usos, 0 `use:enhance` e 0 `onsubmit` no app inteiro**: login, criar apostila, salvar
  conteúdo/quiz, os 7 forms do painel da apostila, `PainelSoltos` (criar + excluir), quiz
  (criar/iniciar/excluir), jogar, responder atividade e importar (criar + exportar).

Decisões e armadilhas:

1. **O `confirm()` de exclusão passa por `confirmar`, não por `onsubmit`.** O `handle_submit`
   do `enhance` sempre chama `event.preventDefault()` e não olha `event.defaultPrevented`; como
   o listener direto dele roda **antes** do `onsubmit` delegado do Svelte, um confirm ali rodaria
   com o fetch já em voo. `confirmar` devolvendo `false` chama `cancel()` (sem fetch, sem `ligar`).
2. **`invalidateAll()` antes do `applyAction` no sucesso.** É o que o `fallback_callback` do
   `enhance` faz (reseta o form + invalida os loads). Esquecer isso foi o bug que derrubou 8 E2E:
   o POST voltava **200**, o botão saía do `loading`, mas as listas de `data` (anexos, seções,
   aulas) nunca recarregavam e a tela ficava velha.
3. **O `enhance` torna o envio assíncrono — E2E de navegação precisa esperar.** Quem clicava
   "Entrar"/"Criar" e já fazia `page.goto` corria antes do `Set-Cookie`/redirect (caía no
   `/login`) ou lia a URL antiga (`apostilaUrl` = `/apostilas/nova`). Corrigido em
   `e2e/fluxo.spec.ts` (espera pelo heading "Apostilas" e pela URL `\/apostilas\/\d+`) e em
   `e2e/inserir-bloco.spec.ts` (`expect.poll` no lugar de `evaluateAll`, que não auto-espera,
   logo depois da navegação para `/editar`).
4. **`aoResultado` trata o resultado sem `applyAction`**, e só existe no exportar do `/importar`
   — preserva o comportamento antigo de não mexer nos selects. Feedback de fetch fora de form
   (salvar a ordem, host e jogador do quiz) usa estados locais: `salvandoOrdem`,
   `comandoEmAndamento` e `alternativaEnviada`.

