// Tabelas do dialeto em uso. Cada coluna carrega o mapa de valores do próprio
// banco — no SQLite, `mode: 'timestamp'` converte `Date` para segundos; no MySQL,
// `datetime` converte para ISO. Usar o objeto do SQLite no driver do MySQL manda
// `1792241512` para uma coluna `datetime` e o insert morre ("Incorrect datetime
// value"), então **quem consulta importa daqui**, não de `schema.ts` nem de
// `schema.mysql.ts`.
//
// O tipo continua sendo o do SQLite (ver `index.ts`): o que muda em runtime é só
// o objeto da tabela. `schema.ts` e `schema.mysql.ts` seguem sendo os pares que o
// `drizzle-kit` gera e que o `schema-paridade.test.ts` mantém alinhados.

import { dialeto } from './index';
import * as mysql from './schema.mysql';
import * as sqlite from './schema';
import type * as Sqlite from './schema';

const ativo = (dialeto === 'mysql' ? mysql : sqlite) as unknown as typeof Sqlite;

export const apostilas = ativo.apostilas;
export const secoes = ativo.secoes;
export const aulas = ativo.aulas;
export const anexos = ativo.anexos;
export const exercicios = ativo.exercicios;
export const quizzes = ativo.quizzes;
