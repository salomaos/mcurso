# mcurso

App pessoal (single user) para criar e gerenciar apostilas de aula. UI, código e commits em pt-BR. Branch `main`, commits com Conventional Commits.

## Stack (decisões acordadas)

- **SvelteKit 2 / Svelte 5** + **adapter-node** (SSR/Node). O `vite.config.ts` força **runes mode** em todo o app (`runes: true` para tudo fora de `node_modules`): componente novo já nasce com `$state`/`$derived`/`$props`/`$effect`, sem `export let`/`$:` legado. Scaffold: `pnpm create sv@latest`
- Node 24, **pnpm**
- **Drizzle ORM** + **SQLite** (`better-sqlite3` driver). Migrations geradas com `drizzle-kit` e **aplicadas no boot do app** (`db/migrar.ts`), não por passo separado de deploy. (PostgreSQL é troca futura, não agora)
- **Better Auth** com adapter Drizzle; login por **senha mestra** — usuário único professor, sem registro/2FA
- CSS: **`@ahmartecnologias/ahmardesign`** (Vanilla CSS). Tema padrão `brutalist` + seletor de tema
- Diagramas: **Mermaid**. Código: **highlight.js**. Fórmulas: **KaTeX** (adicionado quando necessário)
- Testes: **Vitest** (unit/integration) + **Playwright** (E2E)

## Comandos

- Dev: `pnpm dev` | Build: `pnpm build` (`vite build` + `scripts/copiar-migracoes.mjs`, que joga `drizzle/` dentro de `build/drizzle` para o deploy; o `svelte-kit sync` vem do `prepare` no install e do `check`) | Preview: `pnpm preview`
- Tipos: `pnpm check` / `pnpm check:watch` | Unit: `pnpm test` / `pnpm test:watch`
- DB: `pnpm db:generate` (gera a migration) → `pnpm db:migrate` (aplica na mão; em dev e produção o **app já aplica sozinho no boot**). O `drizzle.config.ts` carrega `dotenv/config` e usa `DB_PATH`
- E2E: `pnpm exec playwright test <specs>` — **sempre com as specs no argumento**. Sem argumento a coleta quebra: `e2e/repro-bugs.spec.ts` e `e2e/repro-tabela-exercicio.spec.ts` são arquivos de repro com sintaxe propositalmente inválida e **não** estão no `testIgnore` do `playwright.config.ts`
  - Suíte: `pnpm exec playwright test e2e/apresentacao.spec.ts e2e/arrastar.spec.ts e2e/fluxo.spec.ts e2e/tema.spec.ts e2e/anexos.spec.ts e2e/exercicios.spec.ts e2e/inserir-bloco.spec.ts` (41 testes)
- `pnpm check` sai com código 1 por **22 erros externos** em `..\ahmardesign\src\js\ahmardesign.js` (fonte da lib, não versionada aqui): baseline conhecido, não é regressão do app. O que importa: **zero diagnóstico em `src/` e `e2e/`**
- Unit (`vitest.config.ts`) só coleta `src/**/*.{test,spec}.{js,ts}` e exclui `e2e/**`, com `environment: 'node'`
- E2E **nunca toca no banco dev**: o `webServer` roda `pnpm build && node scripts/e2e-reset.mjs && node build`, recriando `data/e2e.db` e `data/e2e-uploads` a cada execução (porta 5179, `workers: 1`, `fullyParallel: false`, `retries: 0`). Sem `drizzle-kit migrate`: o app migra sozinho no boot, então o E2E exercita o mesmo caminho do deploy. As variáveis vivem em `e2e/ambiente.ts` e o `env` do `webServer` sobrescreve o `.env` de propósito (`dotenv` não sobrescreve, então nunca usar `process.env.X ?? ...` para isolar)

## Modelo de dados

- Apostilas **soltas** (sem hierarquia de curso) organizadas por **aulas/encontros**
- Sessão em `event.locals` via `src/hooks.server.ts` (Better Auth); escrita protegida por `requerSessao()` (`$lib/server/guard.ts`) chamada no load/action — não proteger só o markup
- O usuário professor é criado no primeiro login a partir de `APP_MASTER_EMAIL`/`APP_MASTER_PASSWORD`. Trocar a senha mestra depois **não** remixa o hash guardado: o usuário precisa ser resetado
- **Anexos são soltos**: tabela `anexos` independente, **sem** vínculo de posse com apostila ou aula. O aluno chega neles por link dentro de uma aula; eles não aparecem em listagem de aulas, painel da apostila nem no índice
- Conteúdos (aula/anexo/atividade) compartilham blocos, editor e leitura: usar `src/lib/components/{Editor,Visualizar}Conteudo.svelte` + `src/lib/server/conteudo.ts` (parsing/validação) em vez de duplicar rota/componente. `TipoConteudo` é só conceito de UI
- Rotas de anexo na raiz: `/anexos/[anexoId]` (+ `editar`, `imprimir`, `apresentar`); leitura/impressão/apresentação são públicas, edição e `/anexos` exigem sessão. `caminhoAula()`/`caminhoAnexo()` em `src/lib/conteudo.ts` montam as URLs
- Link interno é genérico: `BlocoLink.alvoId` (+ `tipoLink`, sem `alvoApostilaId`). Link de anexo aponta para `/anexos/[id]` e funciona em qualquer apostila; link de aula precisa da apostila do bloco e o `EditorConteudo` passa o `contexto` ao editor. Picker: `alvosParaLinks()` na aula (aulas da apostila + anexos + atividades) e `alvosAnexos()` no anexo (só anexos). Arquivo externo é `tipoLink: 'externo'`
- **Atividades de exercício** (`/exercicios`) são o terceiro conteúdo solto, montado com os mesmos blocos: a parte pública é diferente de aula/anexo. `TipoConteudo: 'exercicio'` com `ROTULO_TIPO` = "Atividade"; rota pública `/exercicios/[id]`
  - **O gabarito não sai do servidor**: `buscarExercicioPublico()` monta as questões com `questoesPublicas()` (`$lib/corrigir.ts`, que só produz `{id, pergunta, alternativas, selecao}` — sem `correta`/`explicacao`) e a action `?/responder` corrige no POST via `corrigirExercicio()`. Nunca passar o bloco inteiro ao componente `Questao.svelte`
  - **Duas modalidades de escolha**: `BlocoExercicio.selecao` = `radio` (uma correta) ou `checkbox` (várias). `correta` é número no rádio e lista no checkbox; bloco antigo (sem o campo) é rádio. `corretasDoExercicio()` normaliza os dois formatos em lista ordenada (descarta índice fora da faixa, usada por editor, correção e hash) e o `normalizarCamposBloco` grava sempre no formato da modalidade
  - Múltipla escolha exige **conjunto exato**: marcar a certa e mais uma já é errado. No checkbox a resposta chega em `q_<id>` repetido (`form.getAll`), no rádio em um valor só
  - **Dissertativa** é o bloco `dissertativa` (`pergunta` + `orientacao`): resposta aberta, **fora da nota automática** (não conta em `acertos`/`total`). No POST vem em `d_<id>` (limite `LIMITE_DISSERTATIVA`); fora da atividade é só rascunho efêmero. A resposta volta no resultado em `textarea` somente leitura (assim imprime)
  - **Fórmula em alternativa**: o conteúdo entre `$` e `$` (`$lib/matematica.ts` → `TextoMatematico.svelte`) sai com KaTeX, mantendo a alternativa como string só no banco. No PNG do resultado aparece o LaTeX cru (canvas não desenha KaTeX)
  - **Nome do aluno em `sessionStorage`** (`$lib/nome-aluno.ts`, nunca servidor): sobrevive a recarregar e some ao fechar o navegador. Guardar no `oninput`, ler no `onMount` (não existe no SSR)
  - Resultado marca **quais alternativas foram selecionadas** (badge "selecionada" + gabarito) no HTML, no PNG (`[x]`/`[ ]` + "gabarito", para sobreviver a tons de cinza) e no papel
  - Impressão do resultado: botão "Imprimir / PDF" com `window.print()` — sem dependência. `@media print` no `app.css` (`.no-print` esconde botões, `.quebra-pagina` não corta pergunta no meio); `print-color-adjust: exact` é global, então as cores do gabarito saem
  - Sem persistência: o resultado volta no `form` da própria action. Resposta em branco ou índice fora da faixa é zero, não erro (`Number('')` é `0` — descartar string vazia antes)
  - **Chave de integridade** (`$lib/server/chave.ts`): HMAC-SHA256 com `BETTER_AUTH_SECRET` e rótulo de domínio `mcurso:chave-resultado:v1`, formato `base64url(payload).assinatura`. Carrega nome, quando, atividade, apostila/aula, acertos, total e `hashGabarito()` (por questão, os índices corretos unidos com `+`; questões separadas por `|`, ex.: `0+2|1`, e só entra bloco de exercício). É base64, **não criptografia**; a tela de validação (futura) lê e confere a assinatura. Não cobre as respostas discursivas (a chave é da nota)
  - Contexto de origem por `?aula=<id>`: o link de atividade posto dentro de uma aula gera a query (`hrefLinkInterno` com `aulaContexto`), o `BlocoRender`/`VisualizarConteudo` repassam `aulaContexto`. É isso que a chave registra
  - Resultado vira PNG no cliente com Canvas em `$lib/imagem.ts` (sem `html-to-image`, fontes só genéricas, card é texto puro porque `/uploads/*` exige sessão)
  - Atividade em uso não pode ser excluída (409), igual ao anexo; `/exercicios` lista em quais aulas é usada. Atenção ao nome do campo na listagem: `ExercicioUi.discursivas` (sem o "t"), enquanto a correção usa `Correcao.dissertativas` — não padronizar sem mexer nos dois lados
- Referência de anexo não é posse: `/anexos` lista em quais aulas ele é usado (único por aula) e a action devolve 409 ao excluir anexo em uso, pedindo para remover os links
- **Seções** são catálogo normalizado: tabela `secoes` (`id`, `apostilaId`, `nome`, `ordem`) e `aulas.secaoId` nullable; CRUD no painel da apostila, select no editor, agrupamento na listagem. Nome único por apostila (comparação sem acento/caixa, máx. 60) e ordenado por `ordem`, com grupo "sem seção" no fim
- SQLite não liga `PRAGMA foreign_keys`: ações que apagam seção/apostila/nullam `aulas.secaoId` por conta própria
- Blocos de conteúdo (JSON em coluna, não tabela filha): texto/cabeçalhos, código, mermaid, imagem, tabela, fórmulas, links, exercício e dissertativa — todos disponíveis como opção, adicionando conforme necessário. `Exercicio.svelte` e `Dissertativa.svelte` editam dentro do próprio card (`EM_CARTAO` no `EditorCanvas`), sem camada de configuração
- **Criação de bloco é um grid de botões** no fim do `EditorCanvas` (um por item de `TIPOS_BLOCO`, `role="group"` com rótulo "Adicionar bloco"): clicar já cria, sem select prévio. Ícone em cima e rótulo embaixo, com `Icone.svelte` + `src/lib/icones.ts` (SVGs inline, traço em `currentColor` — a lib é CSS puro e não tem set de ícones). O novo bloco entra **logo abaixo do selecionado** (fim da lista se nada estiver selecionado) e já vem selecionado
- **Faixa de inserção**: cada bloco (menos o último) tem um botão flutuante na borda de baixo, no vão para o próximo, que aparece no hover e abre o mesmo grid **naquela posição** (`insercaoAberta` guarda o `id` do bloco de cima, nunca o índice). Há também a faixa do **topo**, no vão entre o cabeçalho (título/descrição) e o primeiro bloco: é o único jeito de criar o bloco 0, já que o grid do fim só insere abaixo do selecionado (`insercaoAberta = INICIO`, sentinel — id de bloco é UUID, não colide). Ela mora direto no canvas (não tem `article` acima), então **o próprio botão** é o gatilho do hover, e só existe com blocos na lista: sem nenhum, quem cria o primeiro é o grid do fim. Quatro armadilhas já resolvidas, não reintroduzir: o botão mora **dentro** do `article` (como irmão, cada vão ganharia `space-y-4` duas vezes); o clique fora usa `svelte:window onclickcapture` + `composedPath()` (no `onclick` comum o `event.target` já saiu do DOM e a faixa abre e fecha no mesmo clique); e o `onfocusin` do `article` **ignora** `[data-inserir-bloco]` (selecionar o bloco abre a camada de configuração, o bloco cresce e o `pointerup` cai fora do botão). Grid compartilhado em `CriadorBloco.svelte`; `rotuloGrupo` é "Tipos de bloco" na faixa porque o `getByRole` do Playwright casa por substring
- **Conteúdo com `$...$` sai com KaTeX** (`partesMatematicas`), no mesmo lugar que texto: enunciado, alternativa, explicação, orientação. Convencionar o delimitador em vez de criar bloco-filho por fórmula mantém o banco como string; `temMatematica` troca a fonte para monoespaçada no PNG (canvas não desenha KaTeX)
- **Sem draft/publicado e sem histórico**: edição direta, versão única
- Uploads (imagens/anexos): salvar em **pasta local servida pela app** (não base64 no BD) em `UPLOADS_DIR`, servida por `/uploads/[...caminho]` — que **exige sessão** (é por isso que o PNG do resultado é card de texto puro)
- **Ordenação por drag and drop**: blocos (posição no JSON), aulas (`ordem`) e seções (`ordem`). Cada soltar envia a lista inteira para uma action `?/reordenar*` (valida pertencer à apostila) e renumera em transação
- PDF: rota SSR própria com `@media print`, uma página por aula/anexo/atividade; usuário imprime com Ctrl+P (sem geração server-side)

## ahmardesign — regras (da doc da lib, não óbvias)

- **A lib é a fonte da verdade da UI**: construir com as classes do `ahmardesign` (`btn`, `card`, `select`, `alert`, `tabs`, utilitários de flex/gap/spacing/radius…). Antes de escrever qualquer estilo, verificar se a lib já não resolve — não recriar componentes nem aparência da lib no app
- **CSS local (`<style>` no Svelte) precisa ser justificado**: só quando a lib não tem o que precisa, e no mínimo possível. Nunca estilizar por convenience/ajuste fino o que a lib já cobre
- **Nunca hardcodar o que o tema muda** (raio, cor, espaçamento): usar os tokens/classes do tema, senão o layout quebra em temas quadrados como `brutalist` (`--rounded-box: 0px`). Ex.: raio → classes `.rounded-box`/`.rounded-btn`/`.rounded-badge` ou `var(--rounded-box)`/`.rounded-btn`; no CSS local, preferir a classe da lib
- **A lib vem do registry** (`^1.2.0` no package.json) para o deploy funcionar em qualquer host. Mudança na lib local só entra no app depois de `npm publish` + `pnpm install`; para developar contra o fonte, dá pra apontar temporariamente para `link:../ahmardesign` (symlink/junction) e voltar para `^x.y.z` antes de publicar (ou usar `workspace:` se virar workspace)
- CSS importa no servidor normalmente: `@ahmartecnologias/ahmardesign/ahmardesign.css` via subcaminho do package `exports`
- **O helper JS (`.../ahmardesign.js`) SÓ no cliente** — executa `AHMAR.init()` na carga e acessa `document.body`/`localStorage`: usar import dinâmico em `onMount`, nunca no SSR
- Tema via `data-theme` no `<body>`; `AHMAR.setTheme()`; evento `ahmar-theme-change` no `window` para sincronizar store Svelte
- **Tema sem flash (FOUC)**: o SSR sempre emite `data-theme="brutalist"`, então o `app.html` tem um `<script>` síncrono no início do `<body>` que aplica a chave `ahmar-theme` do localStorage antes de `%sveltekit.body%`. Consequências: a chave é a da lib (`ahmar-theme`, não uma própria) e a lista de temas válidos é duplicada no script — `src/lib/theme.test.ts` falha se as duas divergirem. Também importa aplicar `iniciarTema()` **antes** de `AHMAR.init()`, senão o `initTheme()` da lib cai no `light` e troca o tema depois da primeira pintura
- Componentes **não têm margem padrão**: usar `gap` (flex/grid) **ou** `.space-y-*` (irmãos não-flex), nunca os dois juntos no mesmo container
- `AHMAR.init()` é idempotente — chamar no mount cobre elementos renderizados depois (`{#if}`, blocos dinâmicos)

## Componentes de UI

- **`DOCS/componentes-ui.md` é a fonte da verdade do que já foi extraído**: plano priorizado (P0–P3) com colunas de status (`⬜`/`🚧`/`✅`) e as ocorrências a unificar. **Ao criar um componente, marcar o status e a data lá** — não confiar em memória nem em commit antigo
- **Primitivas genéricas vão em `src/lib/components/ui/`** (as previstas: `Pagina`, `Campo`, `BarraAcoes`, `Botao`, `Contador`, `CardConteudo`, `DataBadge`); **componentes de domínio ficam planos** ao lado dos atuais (previstos: `Alternativa`, `ListaBlocos`, `AlcaArrasto`)
- **Wrapper é fino, nunca um design system paralelo**: padroniza *intenção* (qual largura, qual variante) e encapsula decisão repetida. Aparência continua sendo a classe da lib; `class`/`...rest` sempre repassados. Componente novo só nasce com **3+ repetições** do mesmo padrão — abaixo disso, deixar o `class` direto
- **Nada de wrapper para o que já é classe da lib** (`alert`, `card`, `modal`, `table`, `tabs`, `btn`, utilitários de flex/gap). Se a inconsistência é de *classe*, padroniza-se a classe, não se cria componente
- **Largura de página é sempre `Pagina`** (P0.1 do plano, já existe), nunca `container max-w-*` solto: `estreito` (2xl, criação) / `conteudo` (3xl, leitura e impressão) / `amplo` (5xl, edição e listagens). Editor e leitura do mesmo conteúdo usam larguras diferentes **de propósito** — não "corrigir" uma para a outra
- **Rótulo de ação é contrato de E2E**: "Imprimir/PDF" (link de contexto), "Imprimir / salvar PDF" (página de impressão), "Imprimir / PDF" (cartão de resultado), "Apresentar" e "Visualizar" estão fixados em specs e viraram constante em `$lib/conteudo.ts`. **São três strings de impressão diferentes** — reaproveitar a constante errada quebra o E2E sem erro de tipo. Ao extrair, **reusar a string existente**, nunca renomear
- **`Campo` com `extra` não usa `.label`**: o padding horizontal da lib empurra o controle extra 8px para dentro e ele desalinha da borda do campo (`fluxo.spec.ts` mede isso no tema do Mermaid). Com `extra` a linha do rótulo é flex puro

## Integrações com quirks conhecidos

- Better Auth no SvelteKit precisa `basePath: '/api/auth'` na inicialização do `auth.ts`; o `src/hooks.server.ts` resolve a sessão **antes** de cada request e põe em `event.locals`, e o `svelteKitHandler` ainda atende `/api/auth/*`
- `src/lib/server/auth-cli.ts` é config mínima do Better Auth usada **só** pelo CLI (`@better-auth/cli`) para gerar o `auth-schema.ts`; não é o auth do runtime
- Mermaid roda em SSR? Não — renderizar no cliente (blocos mermaid são típicos candidatos a componente `{#if}`/lazy no SvelteKit)
- Tema do Mermaid é **por bloco** (`tema` em `BlocoMermaid`, default `neutral`, lista em `TEMAS_MERMAID`): muda só `mermaid.initialize({ theme })` e o `$effect` do `Mermaid.svelte` re-renderiza. Valor vindo do POST é saneado em `normalizarCamposBloco` — bloco antigo sem o campo ou com tema fora da lista cai no default, nunca é descartado (o bloco inteiro tem mais valor que o cosmético)
- adapter-node: dependência em `dependencies` fica **externa** no build (resolvida de `node_modules` em runtime); em `devDependencies` é **bundlada**. `better-sqlite3` (addon nativo) DEVE ficar em `dependencies` — se for bundlado, `require.main` explode em runtime ESM ("require is not defined"). `ssr.external`/`rollupOptions.external` no vite não funcionam nesse caso (rolldown ignora); a regra é o package.json
- O `better-sqlite3` v13 já traz binário pronto em `prebuilds/*.node` (win32/linux/mac, com e sem musl), por isso `pnpm-workspace.yaml` pode deixar o build dele em `ignoredBuiltDependencies` sem quebrar nada
- drizzle + better-sqlite3 é **síncrono**: callback de `db.transaction` não pode ser `async` ("Transaction function cannot return a promise") e builders só executam no `.run()`/`.execute()`/await — dentro da transação use `.run()` sem `await`
- **Migration no boot, não no deploy**: `aplicarMigrations()` roda dentro de `db/index.ts`, que é importado por `auth.ts` → `hooks.server.ts` no boot, antes de qualquer consulta. Não usar `drizzle-kit migrate` no servidor (é devDependency e a Hostinger pode instalar só `dependencies`); `pnpm db:migrate` continua valendo para a mão. A pasta é resolvida por `pastaMigrations()` (`drizzle`, `build/drizzle`, `../drizzle`, ou `MIGRATIONS_DIR`) e o `build` deixa cópia em `build/drizzle` para o deploy não depender do checkout
- `DB_PATH`/`UPLOADS_DIR` em produção precisam estar **fora da pasta de build**: host com build versionado (Hostinger) apaga a pasta a cada deploy, e o banco e os uploads somem junto
- Arrasto de listas é genérico em `src/lib/arrastar.ts`: o item usa `{@attach arrastar(opcoes)}` e o container `data-arrasto-lista={grupo}`; `data-arrasto-item` marca cada item e `data-arrasto-alca` a alça (o arrasto só começa nela, para não sequestrar seleção/caret do `TextoEditavel`). `moverItem` faz o splice local e as classes `.arrastando`/`.arrasto-alvo(-fim)` vivem no `app.css` (a lib não tem estilo de arrasto)

## Estado verificado (última checagem local)

- `pnpm test` 77/77 (7 arquivos), E2E 41/41, `pnpm build` ok, `pnpm check` 0 erros (a lib agora vem do registry, sem os 22 diagnósticos do fonte local)
- **Fora do escopo por decisão, não é bug**: tela de validação da chave (a chave é gerada e assinada, mas ninguém confere ainda), chave sem as respostas discursivas, sem histórico/draft, sem multiusuário, PostgreSQL como troca futura
- Sem bug conhecido aberto. O `apostilaId` faltando nas *instruções* da atividade foi corrigido: a página do aluno repassa `data.contexto.aula?.apostilaId` ao `ListaBlocos`, e sem `?aula=` na URL não existe apostila — aí `hrefLinkInterno` devolve `null` de propósito
