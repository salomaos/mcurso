CREATE TABLE `anexos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`titulo` text NOT NULL,
	`descricao` text,
	`blocos` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
-- Dados: os anexos que nasceram como `aulas.tipo = 'anexo'` (fase anterior do
-- modelo) passam para a tabela própria, já que a coluna vai ser removida.
INSERT INTO `anexos` (`id`, `titulo`, `descricao`, `blocos`, `created_at`, `updated_at`)
SELECT `id`, `titulo`, `descricao`, `blocos`, `created_at`, `updated_at`
FROM `aulas` WHERE `tipo` = 'anexo';
--> statement-breakpoint
DELETE FROM `aulas` WHERE `tipo` = 'anexo';
--> statement-breakpoint
ALTER TABLE `aulas` DROP COLUMN `tipo`;