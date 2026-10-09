CREATE TABLE `quizzes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`titulo` text NOT NULL,
	`descricao` text,
	`perguntas` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
