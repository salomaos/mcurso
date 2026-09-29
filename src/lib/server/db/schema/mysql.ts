import {
	index,
	int,
	json,
	mysqlTable,
	text,
	timestamp,
	varchar
} from 'drizzle-orm/mysql-core';

// Variante MySQL de `schema/sqlite.ts`. As três precisam ter a mesma forma
// (mesmas tabelas, mesmas colunas, mesmos tipos lógicos) — é o que garante o
// `cast` de `schema/index.ts` e o que `schema.test.ts` verifica.
//
// `titulo`/`nome` são `varchar(255)`: o MySQL exige limite em chave/indexada, e
// 255 sobra para o uso real do app (o nome de seção ainda é limitado a 60).

export const apostilas = mysqlTable('apostilas', {
	id: int('id').autoincrement().primaryKey(),
	titulo: varchar('titulo', { length: 255 }).notNull(),
	descricao: text('descricao'),
	createdAt: timestamp('created_at', { mode: 'date' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: timestamp('updated_at', { mode: 'date' })
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
		nome: varchar('nome', { length: 255 }).notNull(),
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
		titulo: varchar('titulo', { length: 255 }).notNull(),
		descricao: text('descricao'),
		ordem: int('ordem').notNull().default(0),
		blocos: json('blocos')
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
export const anexos = mysqlTable('anexos', {
	id: int('id').autoincrement().primaryKey(),
	titulo: varchar('titulo', { length: 255 }).notNull(),
	descricao: text('descricao'),
	blocos: json('blocos')
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
export const exercicios = mysqlTable('exercicios', {
	id: int('id').autoincrement().primaryKey(),
	titulo: varchar('titulo', { length: 255 }).notNull(),
	descricao: text('descricao'),
	blocos: json('blocos')
		.notNull()
		.$defaultFn(() => []),
	createdAt: timestamp('created_at', { mode: 'date' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: timestamp('updated_at', { mode: 'date' })
		.notNull()
		.$defaultFn(() => new Date())
});
