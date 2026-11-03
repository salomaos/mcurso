# @ahmartecnologias/better-sqlite3-stub

Stub de **nome**, não de função. O driver `drizzle-orm/better-sqlite3` faz
`import Client from 'better-sqlite3'` no topo do módulo, e o Node precisa
resolver esse import mesmo quando o client real é outro.

Uso: instalado como alias (`"better-sqlite3": "npm:@ahmartecnologias/better-sqlite3-stub"`)
por apps que passam uma instância própria ao `drizzle(...)` — no caso do mcurso,
o `DatabaseSync` do `node:sqlite` (embutido do Node ≥ 22.13) com os shims de
`src/lib/server/db/node-sqlite.ts`. O driver só instancia `new Client(...)`
quando é chamado **sem** instância, então este módulo nunca é construído: ele
existe apenas para o import resolver no boot.

**Não instale o better-sqlite3 real no lugar deste pacote** se o alvo é um host
sem suporte a módulo nativo (glibc antiga, sem toolchain): é exatamente o que
o stub evita. Substitua o stub quando o drizzle-orm oferecer um driver
oficial para `node:sqlite` — aí o alias, o stub e os shims podem ser
removidos de uma vez.
