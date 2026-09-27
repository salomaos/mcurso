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
