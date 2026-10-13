// Stub de nome, não de função. O driver `drizzle-orm/better-sqlite3` faz
// `import Client from 'better-sqlite3'` no topo do módulo, mas só instancia
// `new Client(...)` quando o `drizzle(...)` é chamado SEM uma instância (com
// string/undefined/config). O app sempre passa uma — o `DatabaseSync` do
// node:sqlite com o shim de `transaction` em
// `src/lib/server/db/node-sqlite.ts` — então este módulo nunca é instanciado:
// precisa apenas existir para o import resolver no boot.
//
// NÃO instalar o pacote real no lugar deste stub: é ele que quebra o deploy
// (nenhum prebuild 12.x/13.x carrega na glibc < 2.29 do host e o node-gyp local
// morre no Python 3.6.8). O SQLite embutido do Node (≥ 22.13) substitui o nativo.
module.exports = class BetterSqlite3Stub {};