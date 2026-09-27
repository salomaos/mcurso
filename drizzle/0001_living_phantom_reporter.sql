CREATE TABLE `secoes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`apostila_id` integer NOT NULL,
	`nome` text NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`apostila_id`) REFERENCES `apostilas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_secoes_apostila` ON `secoes` (`apostila_id`);--> statement-breakpoint
ALTER TABLE `aulas` ADD `secao_id` integer REFERENCES secoes(id);--> statement-breakpoint
CREATE INDEX `idx_aulas_secao` ON `aulas` (`secao_id`);--> statement-breakpoint
INSERT INTO `secoes` (`apostila_id`, `nome`, `ordem`)
SELECT `apostila_id`, `nome`, ROW_NUMBER() OVER (PARTITION BY `apostila_id` ORDER BY `primeira_ordem`, `nome`) - 1
FROM (
	SELECT `apostila_id`, TRIM(`secao`) AS `nome`, MIN(`ordem`) AS `primeira_ordem`
	FROM `aulas`
	WHERE `secao` IS NOT NULL AND TRIM(`secao`) <> ''
	GROUP BY `apostila_id`, TRIM(`secao`)
);--> statement-breakpoint
UPDATE `aulas`
SET `secao_id` = (
	SELECT `s`.`id` FROM `secoes` `s`
	WHERE `s`.`apostila_id` = `aulas`.`apostila_id` AND `s`.`nome` = TRIM(`aulas`.`secao`)
)
WHERE `secao` IS NOT NULL AND TRIM(`secao`) <> '';
