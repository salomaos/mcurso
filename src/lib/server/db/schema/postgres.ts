import { index, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Variante PostgreSQL de `schema/sqlite.ts`. As três precisam ter a mesma forma
// (mesmas tabelas, mesmas colunas, mesmos tipos lógicos) — é o que garante o
// `cast` de `schema/index.ts` e o que `schema.test.ts` verifica.

export const apostilas = pgTable('apostilas', {
	id: serial('id').primaryKey(),
	titulo: text('titulo').notNull(),
	descricao: text('descricao'),
	createdAt: timestamp('created_at', { mode: 'date' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: timestamp('updated_at', { mode: 'date' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const secoes = pgTable(
	'secoes',
	{
		id: serial('id').primaryKey(),
		apostilaId: integer('apostila_id')
			.notNull()
			.references(() => apostilas.id, { onDelete: 'cascade' }),
		nome: text('nome').notNull(),
		ordem: integer('ordem').notNull().default(0)
	},
	(t) => [index('idx_secoes_apostila').on(t.apostilaId)]
);

export const aulas = pgTable(
	'aulas',
	{
		id: serial('id').primaryKey(),
		apostilaId: integer('apostila_id')
			.notNull()
			.references(() => apostilas.id, { onDelete: 'cascade' }),
		secaoId: integer('secao_id').references(() => secoes.id, { onDelete: 'set null' }),
		titulo: text('titulo').notNull(),
		descricao: text('descricao'),
		ordem: integer('ordem').notNull().default(0),
		blocos: jsonb('blocos')
			.notNull()
			.$defaultFn(() => []),
		createdAt: timestamp('created_at', { mode: 'date' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: timestamp('updated_at', { mode: 'date' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [index('idx_aulas_apostila').on(t.apostilaId), index('idx_aulas_secao').on(t.secaoId)]
);

// Anexo é material de apoio solto: não pertence a apostila nem a aula. Vive na
// própria tabela (não em `aulas`) e o aluno chega nele por link dentro de uma aula.
export const anexos = pgTable('anexos', {
	id: serial('id').primaryKey(),
	titulo: text('titulo').notNull(),
	descricao: text('descricao'),
	blocos: jsonb('blocos')
		.notNull()
		.$defaultFn(() => []),
	createdAt: timestamp('created_at', { mode: 'date' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: timestamp('updated_at', { mode: 'date' })
		.notNull()
		.$defaultFn(() => new Date())
});

// Atividade de exercícios: conteúdo solto, mesmo formato de blocos das aulas e
// dos anexos. O gabarito fica no servidor e só volta na tela de resultado.
export const exercicios = pgTable('exercicios', {
	id: serial('id').primaryKey(),
	titulo: text('titulo').notNull(),
	descricao: text('descricao'),
	blocos: jsonb('blocos')
		.notNull()
		.$defaultFn(() => []),
	createdAt: timestamp('created_at', { mode: 'date' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: timestamp('updated_at', { mode: 'date' })
		.notNull()
		.$defaultFn(() => new Date())
});
