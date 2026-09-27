# mcurso

App pessoal (single user) para criar e gerenciar apostilas de aula. UI, código e commits em pt-BR. Branch `main`, commits com Conventional Commits.

## Stack (decisões acordadas)

- **SvelteKit** (última versão) + **adapter-node** (SSR/Node). Scaffold: `pnpm create sv@latest`
- Node 24, **pnpm**
- **Drizzle ORM** + **SQLite** (`better-sqlite3` driver). Migrations via `drizzle-kit`. (PostgreSQL é troca futura, não agora)
- **Better Auth** com adapter Drizzle; login por **senha mestra** — usuário único professor, sem registro/2FA
- CSS: **`@ahmartecnologias/ahmardesign`** (Vanilla CSS). Tema padrão `brutalist` + seletor de tema
- Diagramas: **Mermaid**. Código: **highlight.js**. Fórmulas: **KaTeX** (adicionado quando necessário)
- Testes: **Vitest** (unit/integration) + **Playwright** (E2E)

## Comandos

- Dev: `pnpm dev` | Build: `pnpm build` (roda `svelte-kit sync`) | Preview: `pnpm preview`
- Testes: `pnpm test` (Vitest run) | E2E: `pnpm exec playwright test` (só as specs rastreadas; `e2e/repro-*.spec.ts` são arquivos de repro e não entram na suíte)
- DB: `pnpm exec drizzle-kit generate` → `pnpm exec drizzle-kit migrate`
- E2E **nunca toca no banco dev**: o `webServer` recria `data/e2e.db` a cada execução. As variáveis vivem em `e2e/ambiente.ts` e o `env` do `webServer` sobrescreve o `.env` de propósito (`dotenv` não sobrescreve, então nunca usar `process.env.X ?? ...` para isolar)

## Modelo de dados

- Apostilas **soltas** (sem hierarquia de curso) organizadas por **aulas/encontros**
- **Seções** são catálogo normalizado: tabela `secoes` (`id`, `apostilaId`, `nome`, `ordem`) e `aulas.secaoId` nullable; CRUD no painel da apostila, select no editor, agrupamento na listagem. Nome único por apostila (comparação sem acento/caixa, máx. 60) e ordenado por `ordem`, com grupo "sem seção" no fim
- SQLite não liga `PRAGMA foreign_keys`: ações que apagam seção/apostila/nullam `aulas.secaoId` por conta própria
- Links em aula: exercícios, anexos, e referência a outras aulas
- Blocos de conteúdo (JSON em coluna, não tabela filha): texto/cabeçalhos, código, mermaid, imagem, tabela, fórmulas, exercícios/quiz — todos disponíveis como opção, adicionando conforme necessidade
- **Sem draft/publicado e sem histórico**: edição direta, versão única
- Uploads (imagens/anexos): salvar em **pasta local servida pela app** (não base64 no BD)
- **Ordenação por drag and drop**: blocos (posição no JSON), aulas (`ordem`) e seções (`ordem`). Cada soltar envia a lista inteira para uma action `?/reordenar*` (valida pertencer à apostila) e renumera em transação
- PDF: rota SSR própria com `@media print`, um PDF por aula; usuário imprime com Ctrl+P (sem geração server-side)

## ahmardesign — regras (da doc da lib, não óbvias)

- **A lib é a fonte da verdade da UI**: construir com as classes do `ahmardesign` (`btn`, `card`, `select`, `alert`, `tabs`, utilitários de flex/gap/spacing/radius…). Antes de escrever qualquer estilo, verificar se a lib já não resolve — não recriar componentes nem aparência da lib no app
- **CSS local (`<style>` no Svelte) precisa ser justificado**: só quando a lib não tem o que precisa, e no mínimo possível. Nunca estilizar por convenience/ajuste fino o que a lib já cobre
- **Nunca hardcodar o que o tema muda** (raio, cor, espaçamento): usar os tokens/classes do tema, senão o layout quebra em temas quadrados como `brutalist` (`--rounded-box: 0px`). Ex.: raio → classes `.rounded-box`/`.rounded-btn`/`.rounded-badge` ou `var(--rounded-box)`/`.rounded-btn`; no CSS local, preferir a classe da lib
- **Dev aponta para o repo local** via `link:../ahmardesign` no package.json (symlink/junction → mudanças na lib valem sem publicar). Para produção, trocar de volta para `^x.y.z` (ou usar `workspace:` se virar workspace)
- CSS importa no servidor normalmente: `@ahmartecnologias/ahmardesign/ahmardesign.css` via subcaminho do package `exports`
- **O helper JS (`.../ahmardesign.js`) SÓ no cliente** — executa `AHMAR.init()` na carga e acessa `document.body`/`localStorage`: usar import dinâmico em `onMount`, nunca no SSR
- Tema via `data-theme` no `<body>`; `AHMAR.setTheme()`; evento `ahmar-theme-change` no `window` para sincronizar store Svelte
- **Tema sem flash (FOUC)**: o SSR sempre emite `data-theme="brutalist"`, então o `app.html` tem um `<script>` síncrono no início do `<body>` que aplica a chave `ahmar-theme` do localStorage antes de `%sveltekit.body%`. Consequências: a chave é a da lib (`ahmar-theme`, não uma própria) e a lista de temas válidos é duplicada no script — `src/lib/theme.test.ts` falha se as duas divergirem. Também importa aplicar `iniciarTema()` **antes** de `AHMAR.init()`, senão o `initTheme()` da lib cai no `light` e troca o tema depois da primeira pintura
- Componentes **não têm margem padrão**: usar `gap` (flex/grid) **ou** `.space-y-*` (irmãos não-flex), nunca os dois juntos no mesmo container
- `AHMAR.init()` é idempotente — chamar no mount cobre elementos renderizados depois (`{#if}`, blocos dinâmicos)

## Integrações com quirks conhecidos

- Better Auth no SvelteKit precisa `basePath: '/api/auth'` na inicialização do `auth.ts`
- Mermaid roda em SSR? Não — renderizar no cliente (blocos mermaid são típicos candidatos a componente `{#if}`/lazy no SvelteKit)
- adapter-node: dependência em `dependencies` fica **externa** no build (resolvida de `node_modules` em runtime); em `devDependencies` é **bundlada**. `better-sqlite3` (addon nativo) DEVE ficar em `dependencies` — se for bundlado, `require.main` explode em runtime ESM ("require is not defined"). `ssr.external`/`rollupOptions.external` no vite não funcionam nesse caso (rolldown ignora); a regra é o package.json
- drizzle + better-sqlite3 é **síncrono**: callback de `db.transaction` não pode ser `async` ("Transaction function cannot return a promise") e builders só executam no `.run()`/`.execute()`/await — dentro da transação use `.run()` sem `await`
- Arrasto de listas é genérico em `src/lib/arrastar.ts`: o item usa `{@attach arrastar(opcoes)}` e o container `data-arrasto-lista={grupo}`; `data-arrasto-item` marca cada item e `data-arrasto-alca` a alça (o arrasto só começa nela, para não sequestrar seleção/caret do `TextoEditavel`). `moverItem` faz o splice local e as classes `.arrastando`/`.arrasto-alvo(-fim)` vivem no `app.css` (a lib não tem estilo de arrasto)
