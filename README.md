# mcurso

Aplicação **single-user** para um professor criar e publicar **apostilas de aula online** — material digital com blocos ricos (texto, código, diagramas Mermaid, fórmulas KaTeX, tabelas, exercícios) que fica **público para leitura** sem login. Apenas criar/editar exige **senha mestra**.

Feito com **SvelteKit** (SSR + `adapter-node`), **Better Auth** (login por senha), **Drizzle ORM** + **SQLite**, a biblioteca de UI **ahmardesign** e **KaTeX/Mermaid** no cliente.

---

## Funcionalidades

**Criação de conteúdo (área protegida por senha)**
- Apostilas com título, descrição e timestamps de criação/atualização.
- Aulas/encontros dentro da apostila, agrupadas por **seção/bloco** opcional e ordenadas.
- Blocos de conteúdo: texto, título, código (com `highlight.js`), **diagrama Mermaid**, imagem (com upload), link (exercício/anexo/aula/externo), **tabela**, **fórmula KaTeX** e **exercício**.
- Editor de blocos com adicionar/remover/reordenar/mudar tipo, tudo salvo como JSON na coluna `blocos` da aula.

**Leitura e apresentação (públicas, sem login)**
- Listagem pública de apostilas na home.
- Página da aula (renders KaTeX, Mermaid e quiz de exercício) com **PDF/imprimir** — rota própria `imprimir` com `@media print` (Ctrl+P), sem gerar arquivo no servidor.
- **Modo apresentação** (`apresentar`): renderiza cada bloco em tela cheia, um por vez, com navegação por teclado (`←/→`, `Espaço`, `PageUp/Down`, `Esc` para sair). Exercícios viram "revelar resposta" para usar em sala.

**Autenticação**
- Usuário único professor, oculto atrás da **senha mestra**. O usuário é criado automaticamente no primeiro login.
- Rotas de leitura são públicas; rotas de escrita exigem sessão (`requerSessao` em `server/guard.ts`).

## Como começar

```bash
# instalar dependências
pnpm install

# criar o .env a partir do exemplo
cp .env.example .env
# → preencha BETTER_AUTH_SECRET, APP_MASTER_PASSWORD (e opcionais)
# dica: BETTER_AUTH_SECRET=$(openssl rand -hex 32)

# criar/rodar migrações do banco (SQLite)
pnpm exec drizzle-kit migrate

# subir o servidor de dev
pnpm dev
```

> **Login**: acesse `/login` e use a senha mestra (campo vazio no `.env` é aviso no dev).

## Scripts

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | servidor de desenvolvimento (HMR) |
| `pnpm build` | build de produção (roda `svelte-kit sync` no pré) |
| `pnpm preview` | serve o build localmente |
| `pnpm check` | `svelte-check` (tipos) |
| `pnpm test` | Vitest (unit + integration) |
| `pnpm test:e2e` | Playwright E2E (fluxo completo do usuário) |

## Estrutura

```
src/
  lib/
    blocks.ts            → tipos/normalização dos blocos de conteúdo
    components/
      BlocoRender.svelte → render de um bloco
      EditorBlocos.svelte → editor de blocos
      Apresentacao.svelte → modo apresentação (slides)
Mermaid.svelte, Formula.svelte, Exercicio.svelte, Codigo.svelte
    server/              → db (schema.sqlite), auth.ts, guard.ts
  routes/
    (app)/apostilas/     → páginas de apostila/aula (públicas de leitura)
    login/               → login com a senha mestra
    api/upload/          → upload de imagens/anexos
```

## Deploy (adapter-node)

O `adapter-node` roda com `out` via `adapter-node` no SvelteKit; o build fixa **`better-sqlite3` em `dependencies`** (não `devDependencies`) — está documentado em `AGENTS.md` por causa do quirk do adapter-node que deixa dependências externas dependentes de `node_modules` no runtime.

## Testes

- **unit/integration**: `src/lib/blocks.test.ts` (Vitest) — valida blocos válidos e normaliza blocos defeituosos.
- **E2E**: `e2e/fluxo.spec.ts` (Playwright) — cria apostila, aula e navega; cobre login e senha errada.

---

> Documentação do scaffold original removida. Ver `AGENTS.md` para o plano/roadmap do projeto.
