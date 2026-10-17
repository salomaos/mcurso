// Gêmeo MySQL de `schema.ts` — mesmo contrato (nomes de tabela e chaves de
// coluna que o app usa), tipos diferentes de propósito. O `schema-paridade.test.ts`
// falha se os dois divergirem.
//
// Decisões do dialeto (ver AGENTS.md): `datetime` com `fsp: 3` no lugar do
// `integer` de timestamp do SQLite (o app continua lendo `Date`) e `json` nativo
// no lugar do `text` com mode 'json'. Índice e FK são iguais — no MySQL (InnoDB)
// a FK é aplicada de verdade, o que só reforça os cascades que o app já faz na mão.

import { datetime, index, int, json, mysqlTable, text } from 'drizzle-orm/mysql-core';

export const apostilas = mysqlTable('apostilas', {
	id: int('id').autoincrement().primaryKey(),
	titulo: text('titulo').notNull(),
	descricao: text('descricao'),
	createdAt: datetime('created_at', { fsp: 3 })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: datetime('updated_at', { fsp: 3 })
		.notNull()
		.$defaultFn(() => new Date())
});

export const secoes = mysqlTable(
	'secoes',
	{
		id: int('id').autoincrement().primaryKey(),
		apostilaId: int('apostila_id')
			.notNull()
			.references(() => apostilas.id, { onDelete: 'cascade' }),
		nome: text('nome').notNull(),
		ordem: int('ordem').notNull().default(0)
	},
	(t) => [index('idx_secoes_apostila').on(t.apostilaId)]
);

export const aulas = mysqlTable(
	'aulas',
	{
		id: int('id').autoincrement().primaryKey(),
		apostilaId: int('apostila_id')
			.notNull()
			.references(() => apostilas.id, { onDelete: 'cascade' }),
		secaoId: int('secao_id').references(() => secoes.id, { onDelete: 'set null' }),
		titulo: text('titulo').notNull(),
		descricao: text('descricao'),
		ordem: int('ordem').notNull().default(0),
		blocos: json('blocos')
			.notNull()
			.$defaultFn(() => []),
		createdAt: datetime('created_at', { fsp: 3 })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: datetime('updated_at', { fsp: 3 })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [index('idx_aulas_apostila').on(t.apostilaId), index('idx_aulas_secao').on(t.secaoId)]
);

// Anexo é material de apoio solto: não pertence a apostila nem a aula. Vive na
// própria tabela (não em `aulas`) e o aluno chega nele por link dentro de uma aula.
export const anexos = mysqlTable('anexos', {
	id: int('id').autoincrement().primaryKey(),
	titulo: text('titulo').notNull(),
	descricao: text('descricao'),
	blocos: json('blocos')
		.notNull()
		.$defaultFn(() => []),
	createdAt: datetime('created_at', { fsp: 3 })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: datetime('updated_at', { fsp: 3 })
		.notNull()
		.$defaultFn(() => new Date())
});

// Atividade de exercícios: conteúdo solto, mesmo formato de blocos das aulas e
// dos anexos. O gabarito fica no servidor e só volta na tela de resultado.
export const exercicios = mysqlTable('exercicios', {
	id: int('id').autoincrement().primaryKey(),
	titulo: text('titulo').notNull(),
	descricao: text('descricao'),
	blocos: json('blocos')
		.notNull()
		.$defaultFn(() => []),
	createdAt: datetime('created_at', { fsp: 3 })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: datetime('updated_at', { fsp: 3 })
		.notNull()
		.$defaultFn(() => new Date())
});

// Quiz estilo Kahoot: as perguntas vivem em JSON na coluna `perguntas`. As
// partidas (sala, jogadores, respostas e ranking) **não** são gravadas: só
// existem em memória enquanto a sala dura (ver `$lib/server/quiz-sala`).
export const quizzes = mysqlTable('quizzes', {
	id: int('id').autoincrement().primaryKey(),
	titulo: text('titulo').notNull(),
	descricao: text('descricao'),
	perguntas: json('perguntas')
		.notNull()
		.$defaultFn(() => []),
	createdAt: datetime('created_at', { fsp: 3 })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: datetime('updated_at', { fsp: 3 })
		.notNull()
		.$defaultFn(() => new Date())
});
