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

export const aulas = sqliteTable(
	'aulas',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		apostilaId: integer('apostila_id')
			.notNull()
			.references(() => apostilas.id, { onDelete: 'cascade' }),
		titulo: text('titulo').notNull(),
		descricao: text('descricao'),
		secao: text('secao'),
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
	(t) => [index('idx_aulas_apostila').on(t.apostilaId)]
);