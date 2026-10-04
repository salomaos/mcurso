# mcurso

Aplicação **single-user** para um professor criar e publicar **apostilas de aula online** — material digital com blocos ricos (texto, código, diagramas Mermaid, fórmulas KaTeX, tabelas, exercícios, links) que fica **público para leitura** sem login. Apenas criar/editar exige **senha mestra**.

Fora das apostilas há ainda os **anexos** (materiais de apoio **soltos**, usados em qualquer aula através de um bloco de link) e as **atividades de exercício** (provas curtas, também soltas, que o aluno responde numa página pública e recebe o resultado com chave de verificação).

Feito com **SvelteKit 2 / Svelte 5** (SSR + `adapter-node`), **Better Auth** (login por senha), **Drizzle ORM** + **SQLite**, a biblioteca de UI **ahmardesign** e **KaTeX/Mermaid** no cliente.

---

## Funcionalidades

**Criação de conteúdo (área protegida por senha)**
- Apostilas com título, descrição e timestamps de criação/atualização.
- Aulas/encontros dentro da apostila, ordenadas e agrupadas por **seção** (catálogo por apostila, com CRUD e reordenação).
- **Anexos soltos** em `/anexos`: lista com busca, indicação de em quais aulas cada anexo é usado (links reversos) e exclusão bloqueada enquanto houver link apontando para ele.
- **Atividades de exercício** em `/exercicios`: montadas com os mesmos blocos, com lista de uso, aviso quando estão sem perguntas e exclusão bloqueada em uso.
- Blocos de conteúdo: **texto em markdown** (negrito, itálico, listas, citação, link, código, títulos), **título de H1 a H6** (nasce em H1; nível por botões na camada de configuração do bloco, com tooltip "Título N"), código (com `highlight.js`), **diagrama Mermaid** (com tema por bloco, escolhível no editor), imagem (com upload), **link** (aula/anexo/atividade/arquivo externo), **tabela**, **fórmula KaTeX**, **exercício** (de uma ou várias respostas corretas) e **dissertativa** (resposta aberta).
- Editor de blocos com adicionar (grid de botões no fim do canvas), remover, reordenar e mudar tipo, tudo salvo como JSON na coluna `blocos`. No bloco de texto a escrita é markdown direto, com barra de formatação (negrito, itálico, código, lista, lista numerada, citação, linha horizontal e link), atalhos Ctrl+B/I/K e prévia formatada fora da edição (clicar nela volta a editar).
- **Drag and drop** para ordenar blocos, aulas e seções.
- Tema `brutalist` por padrão, com seletor de tema persistido (aplicado antes da primeira pintura, sem flash).

**Leitura e apresentação (públicas, sem login)**
- Listagem pública de apostilas na home.
- Página da aula e do anexo (renders KaTeX, Mermaid, exercício de uma ou várias alternativas e dissertativa) com **PDF/imprimir** — rota própria `imprimir` com `@media print` (Ctrl+P), sem gerar arquivo no servidor.
- **Atividade respondida sem login**: nome do aluno + todas as questões numa página, envio por POST e resultado com gabarito, explicação e uma **chave de integridade** (resumo assinado) que o aluno pode guardar como **PNG** ou imprimir em PDF. Nada é gravado no banco — o gabarito não chega ao HTML, a correção acontece no servidor.
  - Questões de **uma** (rádio) ou **várias** alternativas corretas (caixas de seleção): no segundo caso é preciso marcar o conjunto exato. **Dissertativas** aparecem no resultado com a resposta do aluno, para avaliação, fora da nota automática.
  - Fórmulas em enunciado/alternativa: escreva entre `$` e `$` (ex.: `$\frac{1}{2}$`) e sai renderizada com KaTeX.
  - O nome fica no `sessionStorage` do navegador: o aluno não digita de novo ao recarregar, e o nome some ao fechar o navegador.
- **Modo apresentação** (`apresentar`): renderiza cada bloco em tela cheia, um por vez, com navegação por teclado (`←/→`, `Espaço`, `PageUp/Down`, `Esc` para sair). Exercícios viram "revelar resposta" para usar em sala.

**Autenticação**
- Usuário único professor, oculto atrás da **senha mestra**. O usuário é criado automaticamente no primeiro login.
- `src/hooks.server.ts` resolve a sessão em toda requisição (`event.locals`); rotas de leitura são públicas e as de escrita chamam `requerSessao()` no load/action — a proteção não fica só no markup.
- Trocar `APP_MASTER_PASSWORD` no `.env` **depois** do primeiro login não migra o hash guardado: o usuário precisa ser resetado no banco.

## Estado atual

| Checagem | Resultado da última execução local |
| --- | --- |
| `pnpm test` | 96/96 (8 arquivos) |
| E2E (as 6 specs da suíte) | 34/34 |
| `pnpm build` | ok |
| `pnpm check` | 0 erros |

**Ainda não existe (decidido, não é bug)**
- **Tela de validação da chave de integridade**: a chave é gerada e assinada, mas não há página que confira a assinatura. É o lugar natural para exigir a chave antes de dar a nota.
- A chave **não cobre** as respostas discursivas (só a nota automática e o hash do gabarito objetivo).
- Sem histórico nem rascunho: a edição é direta, com versão única.
- Sem multiusuário (por design) e sem PostgreSQL (hoje é SQLite em arquivo; a troca é futura).

## Como começar

```bash
# instalar dependências
pnpm install

# criar o .env a partir do exemplo
cp .env.example .env
# → preencha BETTER_AUTH_SECRET, APP_MASTER_PASSWORD (e opcionais)
# dica: BETTER_AUTH_SECRET=$(openssl rand -hex 32)

# criar/rodar migrações do banco (SQLite)
# → opcional: o dev já aplica as migrations sozinho no boot
pnpm db:migrate

# subir o servidor de dev
pnpm dev
```

> **Login**: acesse `/login` e use a senha mestra (campo vazio no `.env` é aviso no dev).

## Scripts

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | servidor de desenvolvimento (HMR) |
| `pnpm build` | build de produção (`vite build` + cópia de `drizzle/` para dentro de `build/`) |
| `pnpm preview` | serve o build localmente |
| `pnpm check` | tipos com `svelte-check` (ver baseline acima) |
| `pnpm check:watch` | o mesmo, em watch |
| `pnpm test` | unit com Vitest (`src/**`, exclui `e2e/**`) |
| `pnpm test:watch` | unit em watch |
| `pnpm test:e2e` | Playwright — **precisa das specs no argumento** (ver nota abaixo) |
| `pnpm db:generate` | gera a migration a partir do schema Drizzle |
| `pnpm db:migrate` | aplica as migrations no banco (o app também faz isso no boot) |

> **E2E**: cada execução recria `data/e2e.db` e `data/e2e-uploads` (o banco de dev nunca é tocado) e sobe o app na porta 5179. Passe sempre as specs — `playwright test` sem argumento quebra na coleta, porque `e2e/repro-bugs.spec.ts` e `e2e/repro-tabela-exercicio.spec.ts` são arquivos de repro com sintaxe propositalmente inválida e não estão no `testIgnore`:
> `pnpm exec playwright test e2e/apresentacao.spec.ts e2e/arrastar.spec.ts e2e/fluxo.spec.ts e2e/tema.spec.ts e2e/anexos.spec.ts e2e/exercicios.spec.ts`

## Estrutura

```
src/
  hooks.server.ts       → resolve a sessão (Better Auth) em event.locals
  lib/
    blocks.ts            → tipos, normalização e sanitize dos blocos
    conteudo.ts          → Tipos de conteúdo (aula/anexo/atividade), caminhos de rota e contextos
    matematica.ts        → fórmulas inline entre `$...$` (enunciado/alternativa)
    nome-aluno.ts        → nome do aluno no `sessionStorage` (só cliente)
    corrigir.ts          → correção pura das respostas e o payload público sem gabarito
    imagem.ts            → PNG do resultado (Canvas, sem dependência)
    arrastar.ts          → drag and drop genérico (blocos, aulas, seções)
    icones.ts            → SVGs inline (a lib de UI não tem set de ícones)
    theme.svelte.ts      → tema persistido sem FOUC
    auth-client.ts       → cliente do Better Auth para o browser
    components/
      EditorConteudo.svelte    → editor compartilhado (aula, anexo e atividade)
      VisualizarConteudo.svelte→ leitura pública
      ImprimirConteudo.svelte  → rota de impressão
      EditorCanvas.svelte      → canvas de blocos
      EditorBlocoCamada.svelte→ edição de um bloco (inclusive o de link)
      SeletorAlvo.svelte       → busca do alvo do link
      BlocoRender.svelte       → render de um bloco
      Questao.svelte           → questão pública (nunca recebe o gabarito)
      Dissertativa.svelte      → resposta aberta (rascunho, campo do formulário ou resultado)
      TextoMatematico.svelte  → texto com `$...$` saindo com KaTeX
      Apresentacao.svelte      → modo apresentação (slides)
      Mermaid/Formula/Exercicio/Codigo/TextoEditavel/Icone.svelte
      Navbar.svelte, ThemeSelector.svelte
    server/
      conteudo.ts        → parsing/validação comum de aula, anexo e atividade
      aula.ts            → regras de aula (seção, ordem, alvos de link)
      anexo.ts           → regras de anexo (CRUD, links reversos, exclusão)
      exercicio.ts       → atividade: página pública sem gabarito, CRUD, contexto `?aula=`
      chave.ts           → chave de integridade do resultado (HMAC)
      guard.ts           → requerSessao() (protege load/action, não só o markup)
      auth.ts, auth-cli.ts, db/ (schema Drizzle)
  routes/
    (app)/apostilas/     → painel da apostila, aulas e edição
    (app)/anexos/        → listagem solta e rotas do anexo (ler/editar/imprimir/apresentar)
    (app)/exercicios/    → listagem solta e rotas da atividade (responder/editar)
    login/               → login com a senha mestra
    api/upload/          → upload de imagens
    uploads/             → serve os arquivos enviados (exige sessão)
e2e/                     → Playwright (ambiente.ts com as credenciais/banco isolados)
scripts/e2e-reset.mjs    → recria o banco de E2E antes de cada execução
scripts/copiar-migracoes.mjs → copia drizzle/ para dentro de build/ no build
drizzle/                 → migrations e snapshots
```

## Deploy (adapter-node)

O `adapter-node` gera o servidor Node em `build/`, iniciado com `node build`. Quatro pontos que já custaram tempo:

- **As migrations são aplicadas pelo app no boot** (`src/lib/server/db/migrar.ts`, chamado pelo `db/index.ts` antes de qualquer consulta), não por um passo separado de deploy: `drizzle-kit` é `devDependency` e não existe no servidor. O log de boot diz quantas entraram — `[mcurso] 6 migração(ões) aplicada(s) em …` ou `[mcurso] banco em dia em …`. O `pnpm build` copia `drizzle/` para dentro de `build/drizzle`, então só a pasta de build precisa estar no ar (a resolução tenta `drizzle`, `build/drizzle`, `../drizzle` e aceita `MIGRATIONS_DIR`).
- `better-sqlite3` fica em **`dependencies`**, nunca em `devDependencies` (o adapter-node deixa dependências externas resolvidas do `node_modules` em runtime; bundlado, o addon nativo quebra com "require is not defined"). Ele já vem com binário pronto em `prebuilds/`, sem compilar nada.
- Variáveis de ambiente em produção: `DB_PATH` e `UPLOADS_DIR` precisam apontar para caminhos graváveis **e persistentes** (fora da pasta de build, que some a cada novo deploy), mais `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (a URL pública, sem barra final), `APP_MASTER_EMAIL` e `APP_MASTER_PASSWORD` (ver `.env.example`). O servidor escuta em `PORT`/`HOST`, com `ORIGIN` apontando para a URL pública (necessário para os cookies de sessão).
- A lib de UI entra como `^x.y.z` no `package.json` (versão publicada no registry). O `link:../ahmardesign` só funciona no clone local.

## Testes

- **unit**: `src/lib/blocks.test.ts` (blocos válidos/defeatuosos, links internos e modalidades de escolha), `src/lib/corrigir.test.ts` (correção, múltipla escolha e dissertativa), `src/lib/matematica.test.ts` (fórmulas inline), `src/lib/server/chave.test.ts` (chave de integridade), `src/lib/server/db/migrar.test.ts` (resolução da pasta de migrações no deploy), `src/lib/arrastar.test.ts` (ordem no drag and drop) e `src/lib/theme.test.ts` (tema sem flash, lista de temas em sincronia com o app).
- **E2E**: `e2e/fluxo.spec.ts` (login, apostila, aula, editor, seções), `e2e/anexos.spec.ts` (anexo solto, links e exclusão protegida), `e2e/exercicios.spec.ts` (atividade, resposta pública sem login, chave, múltipla escolha, dissertativa e link com origem), `e2e/apresentacao.spec.ts`, `e2e/arrastar.spec.ts` e `e2e/tema.spec.ts`.
- `e2e/repro-*.spec.ts` não fazem parte da suíte: são arquivos de repro propositalmente inválidos, usados para demonstrar falha e não coletados (veja a nota dos scripts).

---

> As decisões de arquitetura, quirks de integração e regras de UI estão em `AGENTS.md`.
