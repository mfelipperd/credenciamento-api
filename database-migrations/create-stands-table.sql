-- Migration para criar tabela de stands
-- Execute este SQL no seu banco de dados MySQL

CREATE TABLE `stands` (
  `id` int NOT NULL AUTO_INCREMENT,
  `stand_number` int NOT NULL,
  `fair_id` int NOT NULL,
  `revenue_id` varchar(36) DEFAULT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_fair_stand_number` (`fair_id`, `stand_number`),
  UNIQUE KEY `UK_revenue_id` (`revenue_id`),
  KEY `IDX_stands_fair_id` (`fair_id`),
  KEY `IDX_stands_revenue_id` (`revenue_id`),
  KEY `IDX_stands_available` (`is_available`),
  CONSTRAINT `FK_stands_revenue` FOREIGN KEY (`revenue_id`) REFERENCES `finance_revenues` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Comentários das colunas
ALTER TABLE `stands` 
  MODIFY COLUMN `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID único do stand',
  MODIFY COLUMN `stand_number` int NOT NULL COMMENT 'Número do stand na feira (1, 2, 3...)',
  MODIFY COLUMN `fair_id` int NOT NULL COMMENT 'ID da feira a qual o stand pertence',
  MODIFY COLUMN `revenue_id` varchar(36) DEFAULT NULL COMMENT 'ID da receita vinculada (UUID) - Relação 1:1',
  MODIFY COLUMN `is_available` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Se o stand está disponível para venda';

-- Comentário da tabela
ALTER TABLE `stands` COMMENT = 'Stands das feiras - controla disponibilidade e vinculação com vendas (relação 1:1 com receitas)';
