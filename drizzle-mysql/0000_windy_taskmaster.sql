CREATE TABLE `anexos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titulo` text NOT NULL,
	`descricao` text,
	`blocos` json NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `anexos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `apostilas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titulo` text NOT NULL,
	`descricao` text,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `apostilas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aulas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`apostila_id` int NOT NULL,
	`secao_id` int,
	`titulo` text NOT NULL,
	`descricao` text,
	`ordem` int NOT NULL DEFAULT 0,
	`blocos` json NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `aulas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exercicios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titulo` text NOT NULL,
	`descricao` text,
	`blocos` json NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `exercicios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titulo` text NOT NULL,
	`descricao` text,
	`perguntas` json NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `quizzes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `secoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`apostila_id` int NOT NULL,
	`nome` text NOT NULL,
	`ordem` int NOT NULL DEFAULT 0,
	CONSTRAINT `secoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `account` (
	`id` varchar(36) NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` timestamp(3),
	`refresh_token_expires_at` timestamp(3),
	`scope` text,
	`password` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(36) NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`token` varchar(255) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` varchar(36) NOT NULL,
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `aulas` ADD CONSTRAINT `aulas_apostila_id_apostilas_id_fk` FOREIGN KEY (`apostila_id`) REFERENCES `apostilas`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `aulas` ADD CONSTRAINT `aulas_secao_id_secoes_id_fk` FOREIGN KEY (`secao_id`) REFERENCES `secoes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `secoes` ADD CONSTRAINT `secoes_apostila_id_apostilas_id_fk` FOREIGN KEY (`apostila_id`) REFERENCES `apostilas`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_aulas_apostila` ON `aulas` (`apostila_id`);--> statement-breakpoint
CREATE INDEX `idx_aulas_secao` ON `aulas` (`secao_id`);--> statement-breakpoint
CREATE INDEX `idx_secoes_apostila` ON `secoes` (`apostila_id`);--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);