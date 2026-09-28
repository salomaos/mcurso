CREATE TABLE `exercicios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`titulo` text NOT NULL,
	`descricao` text,
	`blocos` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
