# mcurso

Aplicação **single-user** para um professor criar e publicar **apostilas de aula online** — material digital com blocos ricos (texto, código, diagramas Mermaid, fórmulas KaTeX, tabelas, exercícios, links, simulações p5/q5) que fica **público para leitura** sem login. Apenas criar/editar exige **senha mestra**.

O bloco de **simulação** roda código **p5.js** ou **q5.js** dentro de uma `iframe` isolada (`sandbox` sem `allow-same-origin`), com prévia automática enquanto o professor digita e um botão que mostra a **face do aluno** (a mesma da leitura, sem código). O canvas acompanha o tamanho da caixa em qualquer largura, então sai nítido e a prévia no editor mostra o mesmo desenho da tela do aluno; a impressão mostra o código em vez do canvas (canvas não sai no papel).

Fora das apostilas há ainda os **anexos** (materiais de apoio **soltos**, usados em qualquer aula através de um bloco de link) e as **atividades de exercício** (provas curtas, também soltas, que o aluno responde numa página pública e recebe o resultado com chave de verificação).

Feito com **SvelteKit 2 / Svelte 5** (SSR + `adapter-node`), **Better Auth** (login por senha), **Drizzle ORM** com **SQLite ou MySQL/MariaDB escolhido por deploy** (`DB_DIALECT`; no SQLite o driver é o `node:sqlite` embutido no Node, sem binário nativo a compilar), a biblioteca de UI **ahmardesign** e **KaTeX/Mermaid** no cliente.

---

## Funcionalidades

**Criação de conteúdo (área protegida por senha)**
- Apostilas com título, descrição e timestamps de criação/atualização.
- **Busca por título** em todas as listagens (apostilas na home, aulas no painel da apostila, anexos e atividades), com alternância entre visão em lista e grade.
- Aulas/encontros dentro da apostila, ordenadas e agrupadas por **seção** (catálogo por apostila, com CRUD e reordenação).
- **Anexos soltos** em `/anexos`: lista com busca, indicação de em quais aulas cada anexo é usado (links reversos) e exclusão bloqueada enquanto houver link apontando para ele.
- **Atividades de exercício** em `/exercicios`: montadas com os mesmos blocos, com lista de uso, aviso quando estão sem perguntas e exclusão bloqueada em uso.
- **Quiz estilo Kahoot** em `/quiz`: livro de perguntas de múltipla escolha com **sala ao vivo** (polling ~1s). O professor abre a sala, projeta o código de 6 caracteres e controla as fases; o aluno entra pelo código numa página pública e responde; o ranking aparece ao vivo e no fim. Só o quiz (título + perguntas) é persistido — partida, jogadores e ranking são efêmeros, guardados em memória.
- **Importação por JSON colado de IA** em `/importar`: cola o JSON (ou clica em **"Ver exemplos completos"** e copia um exemplo pronto por tipo — apostila/anexo/atividade/quiz, com os blocos de exemplo possíveis) e o app cria o conteúdo (apostila **sempre cria nova**; bloco vazio é mantido e avisado). O mesmo JSON vira **export round-trip**: pega o conteúdo existente, devolve no formato do importar e dá para guardar, ajustar e reimportar. O contrato está em `DOCS/importacao-ia.md`.
- Blocos de conteúdo: **texto em markdown** (negrito, itálico, listas, citação, link, código, títulos), **título de H1 a H6** (nasce em H1; nível por botões na camada de configuração do bloco, com tooltip "Título N"), código (com `highlight.js`), **diagrama Mermaid** (com tema por bloco, escolhível no editor), imagem (com upload), **link** (aula/anexo/atividade/arquivo externo), **tabela**, **fórmula KaTeX**, **exercício** (de uma ou várias respostas corretas), **dissertativa** (resposta aberta) e **simulação** (código p5/q5 rodando no navegador).
- Editor de blocos com adicionar (grid de botões no fim do canvas), remover, reordenar e mudar tipo, tudo salvo como JSON na coluna `blocos`. No bloco de texto a escrita é markdown direto, com barra de formatação (negrito, itálico, código, lista, lista numerada, citação, linha horizontal e link), atalhos Ctrl+B/I/K e prévia formatada fora da edição (clicar nela volta a editar).
- **Drag and drop** para ordenar blocos, aulas e seções, na lista ou na grade.
- Tema `brutalist` por padrão, com seletor de tema persistido (aplicado antes da primeira pintura, sem flash).

**Leitura e apresentação (públicas, sem login)**
- Listagem pública de apostilas na home, com **alternância lista/grade** — a escolha é uma preferência do navegador, a mesma para o aluno e para o professor.
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
| `pnpm test` | 156/156 (14 arquivos) |
| E2E (as 15 specs da suíte) | 90/90 no SQLite, 90/90 no MariaDB 10.11 e **90/90 no MariaDB 11.8.9** (a versão da hospedagem, via `docker compose`) |
| `pnpm build` | ok |
| `pnpm check` | 0 erros |

**Ainda não existe (decidido, não é bug)**
- **Tela de validação da chave de integridade**: a chave é gerada e assinada, mas não há página que confira a assinatura. É o lugar natural para exigir a chave antes de dar a nota.
- A chave **não cobre** as respostas discursivas (só a nota automática e o hash do gabarito objetivo).
- Sem histórico nem rascunho: a edição é direta, com versão única.
- Sem multiusuário (por design) e sem PostgreSQL. O banco é **SQLite (dev) ou MySQL/MariaDB (hospedagem), escolhido por deploy** com `DB_DIALECT=sqlite|mysql`: os dois schemas vivem lado a lado (SQLite + gêmeo MySQL, com um teste de paridade) e a **mesma suíte E2E roda nos dois** (`E2E_DIALECT=mysql`). A migração dos dados do SQLite para o MySQL **não existe por decisão**: o deploy MySQL começa de banco vazio e o caminho para levar conteúdo já publicado é o **export/import do `/importar`** (ver [Trocar para MySQL/MariaDB](#trocar-para-mysqlmariadb)).

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

# (opcional) banco de dev em MySQL/MariaDB, na mesma versão da hospedagem
docker compose up -d
# → e para o app apontar para ele (o .env fica em SQLite):
#   PowerShell: $env:DB_DIALECT='mysql'; $env:DB_URL='mysql://mcurso:mcurso@127.0.0.1:3307/mcurso'; pnpm dev

# subir o servidor de dev
pnpm dev
```

> **Banco**: por padrão o app usa **SQLite** em `DB_PATH`. Para rodar contra **MySQL/MariaDB**, preencha `DB_URL` e suba com `DB_DIALECT=mysql` — o app cria as tabelas no boot, pelo mesmo caminho do deploy (`pnpm db:generate:mysql`/`db:migrate:mysql` só servem para gerar/aplicar a migration na mão).

> **Login**: acesse `/login` e use a senha mestra (campo vazio no `.env` é aviso no dev).

## Scripts

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | servidor de desenvolvimento (HMR) |
| `pnpm build` | build de produção (`vite build` + cópia das pastas de migration para dentro de `build/`) |
| `pnpm preview` | serve o build localmente |
| `pnpm check` | tipos com `svelte-check` (ver baseline acima) |
| `pnpm check:watch` | o mesmo, em watch |
| `pnpm test` | unit com Vitest (`src/**`, exclui `e2e/**`) |
| `pnpm test:watch` | unit em watch |
| `pnpm test:e2e` | Playwright — roda a suíte inteira (ver nota abaixo) |
| `pnpm db:generate` | gera a migration a partir do schema Drizzle (SQLite, `drizzle/`) |
| `pnpm db:migrate` | aplica as migrations no banco (o app também faz isso no boot) |
| `pnpm db:generate:mysql` | gera a migration do dialeto MySQL (`drizzle-mysql/`) |
| `pnpm db:migrate:mysql` | aplica as migrations no MySQL/MariaDB (a partir de `DB_URL`) |

> **E2E**: o `webServer` recria o banco de E2E (`drop`/`create` no MySQL, arquivos no SQLite — o banco de dev nunca é tocado), roda o build e sobe o app na porta 5179, sem `drizzle-kit`. O reset vem **antes** do build de propósito: o `analyse` do pós-build do SvelteKit importa o módulo do servidor, que abre a conexão e aplica as migrations — se o banco ainda não existir, o build do MySQL morre com `ER_BAD_DB_ERROR`. Para um subconjunto, passe as specs: `pnpm exec playwright test e2e/fluxo.spec.ts e2e/quiz.spec.ts`.
>
> **A mesma suíte** roda contra o MySQL/MariaDB: `docker compose up -d` sobe o banco local na **mesma versão da hospedagem** (MariaDB 11.8.9, porta 3307, `root`/`mcurso`) e o `E2E_DB_URL` default já aponta para ele — basta `$env:E2E_DIALECT='mysql'; pnpm test:e2e`. Para outro servidor, `E2E_DB_URL=mysql://usuario:senha@host:porta/mcurso_e2e`: o banco **precisa** terminar em `_e2e` (a trava do reset contra apagar um banco de verdade) e o usuário precisa poder criar/apagar bancos.

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
    visao.svelte.ts      → lista ou grade nas listas de conteúdo (preferência do navegador)
    auth-client.ts       → cliente do Better Auth para o browser
    markdown.ts          → markdown do bloco de texto (marked + sanitize)
    importar.ts          → parser do JSON colado de IA (client-safe)
    blocos-pendentes.ts  → blocos vazios que o editor avisa depois de importar
    quiz.ts              → tipos, normalização, pontuação e ranking do quiz
    quiz-cliente.ts      → busca de estado / envio de ação da sala (fetch)
    casca-sandbox.ts     → documento da iframe isolada (simulação e bloco HTML)
    enviando.ts          → action `use:enviando` (feedback padrão de todo form POST)
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
      Simulacao.svelte         → código p5/q5 rodando em iframe isolada (editor e leitura)
      TextoMatematico.svelte  → texto com `$...$` saindo com KaTeX
      Apresentacao.svelte      → modo apresentação (slides)
      Mermaid/Formula/Exercicio/Dissertativa/Codigo/TextoEditavel/TextoMarkdown/Html/Icone.svelte
      ListaBlocos.svelte       → lista de blocos (leitura, sem edição)
      ui/                      → primitivas (Pagina, CabecalhoPagina, Campo, CardConteudo, …)
      Navbar.svelte, ThemeSelector.svelte
    server/
      conteudo.ts        → parsing/validação comum de aula, anexo e atividade
      apostila.ts        → painel da apostila: seções, ordem de aulas e exclusão (transações)
      aula.ts            → regras de aula (seção, ordem, alvos de link)
      anexo.ts           → regras de anexo (CRUD, links reversos, exclusão)
      exercicio.ts       → atividade: página pública sem gabarito, CRUD, contexto `?aula=`
      quiz.ts            → CRUD do quiz (só o livro de perguntas vai ao banco)
      quiz-sala.ts       → sala ao vivo do quiz em memória (polling, fases, ranking)
      importar.ts        → importação/exportação transacional do JSON de IA
      chave.ts           → chave de integridade do resultado (HMAC)
      guard.ts           → requerSessao() (protege load/action, não só o markup)
      auth.ts, auth-cli.ts, auth-cli-mysql.ts
      db/index.ts        → dialeto (DB_DIALECT), conexão e migração no boot
      db/tabelas.ts      → objetos de tabela do dialeto em uso (é daqui que as consultas importam)
      db/inserir.ts      → insert que devolve o id nos dois dialetos (returning / $returningId)
      db/schema.ts + schema.mysql.ts, auth-schema.ts + auth-schema.mysql.ts → os pares de schema
      db/migrar.ts, db/transacao.ts, db/node-sqlite.ts → migração por dialeto, transação e shim do node:sqlite
  routes/
    (app)/apostilas/     → painel da apostila, aulas e edição
    (app)/anexos/        → listagem solta e rotas do anexo (ler/editar/imprimir/apresentar)
    (app)/exercicios/    → listagem solta e rotas da atividade (responder/editar)
    (app)/quiz/          → lista e editor, host (professor) e jogar (aluno)
    (app)/importar/      → cola JSON de IA e exporta de volta
    login/               → login com a senha mestra
    lib/[...caminho]/     → serve p5.min.js/q5.js do node_modules (allowlist, sem CDN)
    api/upload/          → upload de imagens
    api/quiz/sala/       → polling da sala do quiz (estado e ações do host/jogador)
    uploads/             → serve os arquivos enviados (exige sessão)
e2e/                     → Playwright (ambiente.ts com as credenciais/banco isolados)
scripts/e2e-reset.mjs    → recria o banco de E2E antes de cada execução (arquivos no SQLite, drop/create no MySQL)
scripts/copiar-migracoes.mjs → copia `drizzle/` e `drizzle-mysql/` para dentro de `build/`
docker-compose.yml       → banco de dev/E2E (MariaDB 11.8.9, a mesma versão da hospedagem)
drizzle/                 → migrations e snapshots (SQLite)
drizzle-mysql/           → migrations e snapshots (MySQL/MariaDB)
```

## Deploy (adapter-node)

O `adapter-node` gera o servidor Node em `build/`, iniciado com `node build`. Quatro pontos que já custaram tempo:

- **As migrations são aplicadas pelo app no boot** (`src/lib/server/db/migrar.ts`, chamado pelo `db/index.ts` antes de qualquer consulta), não por um passo separado de deploy: `drizzle-kit` é `devDependency` e não existe no servidor. A pasta é escolhida pelo dialeto (`drizzle/` no SQLite, `drizzle-mysql/` no MySQL, com `MIGRATIONS_DIR` como escape) e o log de boot diz quantas entraram — `[mcurso] 6 migração(ões) aplicada(s) em mysql://***@host/mcurso` ou `[mcurso] banco em dia em …`. O `pnpm build` copia **as duas** pastas para dentro de `build/`, então só a pasta de build precisa estar no ar. (O build também conecta e migra — ver o item do `ER_BAD_DB_ERROR` mais abaixo.)
- **O app não tem nenhuma dependência nativa**: no SQLite o driver é o `node:sqlite` embutido no Node ≥ 22.13 (`DatabaseSync`) — o que já quebrou o deploy duas vezes com o glibc antigo da hospedagem — e no MySQL é o `mysql2`, JavaScript puro. O import do driver `better-sqlite3` do drizzle é satisfeito por um stub em `vendor/better-sqlite3-stub` — nunca instanciado, porque o app sempre passa a instância do `node:sqlite`. O `engines.node` exige `>=22.13`.
- `p5` e `q5` também ficam em **`dependencies`** pelo mesmo motivo: a rota `lib/[...caminho]` resolve os arquivos no `node_modules` em runtime (a `iframe` do bloco de simulação não pode ir para CDN e o `exports` do p5 bloqueia o caminho normal). No deploy, as duas precisam estar instaladas junto do `node_modules`.
- **O build também fala com o banco**: o `analyse` do pós-build do SvelteKit importa o módulo do servidor, então o `pnpm build` abre a conexão e aplica as migrations (um banco vazio vira as 11 tabelas só com o build). Com `DB_DIALECT=mysql`, o banco precisa **existir** na hora do build (senão ele morre com `ER_BAD_DB_ERROR`) e o usuário precisa de DDL no build **e** no boot — crie o banco no painel antes de subir o código.
- Variáveis de ambiente em produção: `DB_DIALECT` (`sqlite` ou `mysql`) e, conforme o dialeto, `DB_PATH` ou `DB_URL` (e `UPLOADS_DIR`), com caminhos graváveis **e persistentes** (fora da pasta de build, que some a cada novo deploy) — mais `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (a URL pública, sem barra final), `APP_MASTER_EMAIL` e `APP_MASTER_PASSWORD` (ver `.env.example`). O servidor escuta em `PORT`/`HOST`, com `ORIGIN` apontando para a URL pública (necessário para os cookies de sessão).
- A lib de UI entra como `^x.y.z` no `package.json` (versão publicada no registry). O `link:../ahmardesign` só funciona no clone local.

### Trocar para MySQL/MariaDB

O banco é escolha de **deploy**, não de código: quem lê `DB_DIALECT` é o `src/lib/server/db/index.ts` na subida, e nenhum arquivo do app muda. O que confunde é que **o `.env` é gitignored** (`.env` e `.env.*` no `.gitignore`, com `!.env.example`): ele **nunca viaja no push**, então o `.env` da hospedagem é seu e continua como estava — o que foi para o repositório é só o `.env.example` (o modelo).

Num deploy que já roda em SQLite, a virada é o `.env` (ou as variáveis de ambiente do painel — o `adapter-node` lê `process.env` direto e o `dotenv` não sobrescreve o que já existe):

```bash
DB_DIALECT=mysql
DB_URL=mysql://usuario:senha@127.0.0.1:3306/banco
```

- `DB_DIALECT` é comparação **exata**: `mysql` minúsculo. `MySQL`/`MYSQL` cai em SQLite **em silêncio** (não dá erro).
- Com `DB_DIALECT=mysql` e **sem** `DB_URL`, o app **recusa subir** com mensagem clara, em vez de cair no SQLite.
- **Copie nome/usuário/host do painel** da hospedagem (a Hostinger prefixa, ex. `u123456_mcurso`) e crie o banco com **`utf8mb4` / `utf8mb4_unicode_ci`** (a Hostinger hoje: MariaDB 11.8 + `utf8mb4_unicode_ci`). O app não tem `LIKE` em SQL — a busca é filtro de tela —, então a collation afeta ordenação de texto, não a busca.
- O usuário do banco precisa de **DDL** (CREATE/ALTER/INDEX): o app cria as tabelas no boot, não há passo de migration no deploy.
- `DB_PATH` pode ficar no `.env` (é ignorado no modo mysql) — é o que deixa o **rollback em uma linha**: apagar/comentar o `DB_DIALECT` volta para o SQLite, que segue intacto.
- **Uploads não vão para o banco**: `UPLOADS_DIR` continua sendo pasta de arquivos e precisa do backup dela (o backup gerenciado do MySQL só protege o banco).
- **O banco precisa existir antes do build**: o `vite build` também conecta e aplica a migração (o `analyse` do pós-build importa o servidor — ver o item acima), então com `DB_DIALECT=mysql` e sem o banco o build morre com `ER_BAD_DB_ERROR`. Depois de reiniciar, o log diz quantas migrações entraram e quantas tabelas o banco tem: `[mcurso] N migração(ões) aplicada(s) em mysql://***@host/banco … — 11 tabela(s)` (ou `[mcurso] banco em dia em … — 11 tabela(s)`).
- **Se o app subir e der 500 em tudo**: leia o log do servidor — o `handleError` do `hooks.server.ts` loga o `error.cause` do drizzle, que é onde está o código de verdade do MySQL (`PROTOCOL_CONNECTION_LOST`, `ER_ACCESS_DENIED`, `ER_NO_SUCH_TABLE`…; sem ele só aparece um `Failed query: ...` que não diz nada). Duas causas já vistas: (1) conexão única derrubada pelo `wait_timeout` do host — resolvido de vez com o **pool** (o app descarta a conexão morta e abre outra na consulta seguinte); (2) banco vazio com o controle de migração preenchido — o boot avisa (`— 1 tabela(s)`) e **não sobe**, em vez de servir 500: apague a tabela `__drizzle_migrations` e suba de novo.

O banco MySQL **nasce vazio**. Para levar o conteúdo já publicado, use o **export/import do próprio app**, em `/importar`:

1. No site antigo (SQLite), exporte cada apostila/anexo/atividade/quiz.
2. Vire o `.env` para MySQL e reinicie — o build/o boot cria as tabelas (o banco tem que existir antes).
3. Importe os JSONs de volta no site novo (apostila **sempre cria nova**; links internos voltam como `alvoTitulo`, resolvidos por conteúdo existente — importe anexos/atividades que são referenciados antes das apostilas que os citam).

Os arquivos de upload continuam onde estão e as URLs `/uploads/...` seguem valendo (o caminho não muda com o dialeto).

## Testes

- **unit**: `src/lib/blocks.test.ts` (blocos válidos/defeatuosos, links internos e modalidades de escolha), `src/lib/corrigir.test.ts` (correção, múltipla escolha e dissertativa), `src/lib/matematica.test.ts` (fórmulas inline), `src/lib/markdown.test.ts` (markdown do bloco de texto, com escape de HTML), `src/lib/server/chave.test.ts` (chave de integridade), `src/lib/server/db/migrar.test.ts` (resolução da pasta de migrações no deploy), `src/lib/server/db/node-sqlite.test.ts` (shim de transação do `node:sqlite`: commit síncrono, rollback e o corpo async fechando a transação no promise), `src/lib/server/db/schema-paridade.test.ts` (contrato dos schemas SQLite/MySQL em sincronia: tabelas e colunas), `src/lib/arrastar.test.ts` (ordem no drag and drop), `src/lib/theme.test.ts` (tema sem flash, lista de temas em sincronia com o app), `src/lib/visao.test.ts` (preferência lista/grade), `src/lib/quiz.test.ts` (código do quiz, pontuação e importação) e `src/lib/importar.test.ts` + `src/lib/blocos-pendentes.test.ts` (importação por JSON e pendências mantidas).
- **E2E**: `e2e/fluxo.spec.ts` (login, apostila, aula, editor, seções), `e2e/anexos.spec.ts` (anexo solto, links e exclusão protegida), `e2e/exercicios.spec.ts` (atividade, resposta pública sem login, chave, múltipla escolha, dissertativa e link com origem), `e2e/apresentacao.spec.ts`, `e2e/arrastar.spec.ts`, `e2e/tema.spec.ts`, `e2e/inserir-bloco.spec.ts` (grid e faixas de inserção), `e2e/markdown.spec.ts` (bloco de texto em markdown), `e2e/simulacao.spec.ts` (p5/q5 na iframe isolada: rodando, sem erro de sandbox, troca de biblioteca, nitidez do canvas, face do aluno e impressão), `e2e/html.spec.ts` (bloco HTML: script que roda, `<script src>` de lib, erro e correção, toggle e impressão), `e2e/visao.spec.ts` (botão de criar à direita com descrição longa, alternância lista/grade na home e no painel da apostila, escolha compartilhada entre listas e cartão solto), `e2e/busca.spec.ts` (busca por título nas listagens), `e2e/quiz.spec.ts` (sala ao vivo: professor + aluno, encerrar/sair e exportar perguntas) e `e2e/importacao.spec.ts` (importar por JSON, pendência de bloco vazio, export round-trip e popup de exemplo por tipo).

---

> As decisões de arquitetura, quirks de integração e regras de UI estão em `AGENTS.md`.
