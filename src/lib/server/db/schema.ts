import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const apostilas = sqliteTable('apostilas', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	titulo: text('titulo').notNull(),
	descricao: text('descricao'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const secoes = sqliteTable(
	'secoes',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		apostilaId: integer('apostila_id')
			.notNull()
			.references(() => apostilas.id, { onDelete: 'cascade' }),
		nome: text('nome').notNull(),
		ordem: integer('ordem').notNull().default(0)
	},
	(t) => [index('idx_secoes_apostila').on(t.apostilaId)]
);

export const aulas = sqliteTable(
	'aulas',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		apostilaId: integer('apostila_id')
			.notNull()
			.references(() => apostilas.id, { onDelete: 'cascade' }),
		secaoId: integer('secao_id').references(() => secoes.id, { onDelete: 'set null' }),
		titulo: text('titulo').notNull(),
		descricao: text('descricao'),
		ordem: integer('ordem').notNull().default(0),
		blocos: text('blocos', { mode: 'json' })
			.notNull()
			.$defaultFn(() => []),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [index('idx_aulas_apostila').on(t.apostilaId), index('idx_aulas_secao').on(t.secaoId)]
);

// Anexo é material de apoio solto: não pertence a apostila nem a aula. Vive na
// própria tabela (não em `aulas`) e o aluno chega nele por link dentro de uma aula.
export const anexos = sqliteTable('anexos', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	titulo: text('titulo').notNull(),
	descricao: text('descricao'),
	blocos: text('blocos', { mode: 'json' })
		.notNull()
		.$defaultFn(() => []),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// Atividade de exercícios: conteúdo solto, mesmo formato de blocos das aulas e
// dos anexos. O gabarito fica no servidor e só volta na tela de resultado.
export const exercicios = sqliteTable('exercicios', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	titulo: text('titulo').notNull(),
	descricao: text('descricao'),
	blocos: text('blocos', { mode: 'json' })
		.notNull()
		.$defaultFn(() => []),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// Quiz estilo Kahoot: as perguntas vivem em JSON na coluna `perguntas`. As
// partidas (sala, jogadores, respostas e ranking) **não** são gravadas: só
// existem em memória enquanto a sala dura (ver `$lib/server/quiz-sala`).
export const quizzes = sqliteTable('quizzes', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	titulo: text('titulo').notNull(),
	descricao: text('descricao'),
	perguntas: text('perguntas', { mode: 'json' })
		.notNull()
		.$defaultFn(() => []),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});
