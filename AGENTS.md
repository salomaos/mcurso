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
- Testes: `pnpm test` (Vitest run) | E2E: `pnpm exec playwright test`
- DB: `pnpm exec drizzle-kit generate` → `pnpm exec drizzle-kit migrate`

## Modelo de dados

- Apostilas **soltas** (sem hierarquia de curso) organizadas por **aulas/encontros**; aulas agrupáveis em **seções/blocos** opcionais
- Links em aula: exercícios, anexos, e referência a outras aulas
- Blocos de conteúdo (JSON em coluna, não tabela filha): texto/cabeçalhos, código, mermaid, imagem, tabela, fórmulas, exercícios/quiz — todos disponíveis como opção, adicionando conforme necessidade
- **Sem draft/publicado e sem histórico**: edição direta, versão única
- Uploads (imagens/anexos): salvar em **pasta local servida pela app** (não base64 no BD)
- PDF: rota SSR própria com `@media print`, um PDF por aula; usuário imprime com Ctrl+P (sem geração server-side)

## ahmardesign — regras (da doc da lib, não óbvias)

- CSS importa no servidor normalmente: `@ahmartecnologias/ahmardesign/ahmardesign.css` via subcaminho do package `exports`
- **O helper JS (`.../ahmardesign.js`) SÓ no cliente** — executa `AHMAR.init()` na carga e acessa `document.body`/`localStorage`: usar import dinâmico em `onMount`, nunca no SSR
- Tema via `data-theme` no `<body>`; `AHMAR.setTheme()`; evento `ahmar-theme-change` no `window` para sincronizar store Svelte
- Componentes **não têm margem padrão**: usar `gap` (flex/grid) **ou** `.space-y-*` (irmãos não-flex), nunca os dois juntos no mesmo container
- `AHMAR.init()` é idempotente — chamar no mount cobre elementos renderizados depois (`{#if}`, blocos dinâmicos)

## Integrações com quirks conhecidos

- Better Auth no SvelteKit precisa `basePath: '/api/auth'` na inicialização do `auth.ts`
- Mermaid roda em SSR? Não — renderizar no cliente (blocos mermaid são típicos candidatos a componente `{#if}`/lazy no SvelteKit)
- adapter-node: dependência em `dependencies` fica **externa** no build (resolvida de `node_modules` em runtime); em `devDependencies` é **bundlada**. `better-sqlite3` (addon nativo) DEVE ficar em `dependencies` — se for bundlado, `require.main` explode em runtime ESM ("require is not defined"). `ssr.external`/`rollupOptions.external` no vite não funcionam nesse caso (rolldown ignora); a regra é o package.json