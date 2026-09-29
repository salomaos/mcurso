import { PROVEDOR } from '../driver';
import * as mysql from './mysql';
import * as postgres from './postgres';
import * as sqlite from './sqlite';

// `DB_PROVIDER` decide qual das três variantes entra em uso, e o app inteiro é
// escrito contra a **do SQLite**: o schema do SQLite é o "formato de referência"
// das tabelas e o `db` (ver `index.ts`) é tipado como `BetterSQLite3Database`.
//
// Isso é seguro — e não um atalho — por dois motivos:
//   1. as três variantes têm a mesma forma (mesmas tabelas, colunas, nulabilidade
//      e tipos lógicos). `schema.test.ts` falha se isso deixar de valer, e o
//      guarda de compilação no fim deste arquivo falha se um `$inferSelect`
//      divergir de outro (ex.: `bigint` no lugar de `number`);
//   2. as diferenças que sobram — `RETURNING`, transação síncrona e
//      `count()`/`max()` que voltam como string — não são de tipo e estão
//      tratadas em `inserir.ts` e `transacao.ts`.
//
// O Drizzle não deixa o `db` ser a união dos três tipos: chamar `select()`, que é
// genérico em cada dialeto, sobre uma união de assinaturas não compila. Por isso
// o cast é aqui, e não espalhado pelas queries.

const porProvedor = {
	sqlite,
	pg: postgres,
	mysql
} as const;

const escolhido = porProvedor[PROVEDOR] as unknown as typeof sqlite;

export const apostilas = escolhido.apostilas;
export const secoes = escolhido.secoes;
export const aulas = escolhido.aulas;
export const anexos = escolhido.anexos;
export const exercicios = escolhido.exercicios;

export const tabelas = { apostilas, secoes, aulas, anexos, exercicios };

// Guarda de compilação. Se um dia um tipo divergir entre os dialetos — o caso
// real seria `serial` virando `bigint` e o id deixando de ser `number` — estas
// atribuições param de compilar, sem depender de nenhum teste rodado. Só valem
// porque comparam os `$inferSelect` diretamente, sem `as unknown as`.
type Igual<A, B> = (<U>() => U extends A ? 1 : 2) extends <U>() => U extends B ? 1 : 2
	? true
	: false;

const _mesmaForma: [
	Igual<typeof apostilas.$inferSelect, typeof sqlite.apostilas.$inferSelect>,
	Igual<typeof secoes.$inferSelect, typeof sqlite.secoes.$inferSelect>,
	Igual<typeof aulas.$inferSelect, typeof sqlite.aulas.$inferSelect>,
	Igual<typeof anexos.$inferSelect, typeof sqlite.anexos.$inferSelect>,
	Igual<typeof exercicios.$inferSelect, typeof sqlite.exercicios.$inferSelect>
] = [true, true, true, true, true];

const _paridade: [
	Igual<typeof postgres.apostilas.$inferSelect, typeof mysql.apostilas.$inferSelect>,
	Igual<typeof postgres.secoes.$inferSelect, typeof mysql.secoes.$inferSelect>,
	Igual<typeof postgres.aulas.$inferSelect, typeof mysql.aulas.$inferSelect>,
	Igual<typeof postgres.anexos.$inferSelect, typeof mysql.anexos.$inferSelect>,
	Igual<typeof postgres.exercicios.$inferSelect, typeof mysql.exercicios.$inferSelect>
] = [true, true, true, true, true];

void _mesmaForma;
void _paridade;
