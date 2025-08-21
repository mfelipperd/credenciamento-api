-- Migration para criar a tabela de fluxo de caixa
-- Data: 2025-01-31

CREATE TABLE IF NOT EXISTS `finance_cash_flow` (
  `id` char(36) NOT NULL,
  `fairId` char(36) NOT NULL,
  `period` date NOT NULL,
  `totalRevenue` decimal(15,2) NOT NULL DEFAULT 0.00,
  `totalExpenses` decimal(15,2) NOT NULL DEFAULT 0.00,
  `netBalance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `profitMargin` decimal(5,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IDX_finance_cash_flow_fairId_period` (`fairId`, `period`),
  KEY `IDX_finance_cash_flow_period` (`period`),
  KEY `IDX_finance_cash_flow_netBalance` (`netBalance`),
  KEY `IDX_finance_cash_flow_profitMargin` (`profitMargin`),
  CONSTRAINT `FK_finance_cash_flow_fair` FOREIGN KEY (`fairId`) REFERENCES `fairs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices adicionais para otimização de consultas
CREATE INDEX `IDX_finance_cash_flow_profitable` ON `finance_cash_flow` (`netBalance`) WHERE `netBalance` > 0;
CREATE INDEX `IDX_finance_cash_flow_loss` ON `finance_cash_flow` (`netBalance`) WHERE `netBalance` < 0;

-- Comentários sobre a estrutura
-- Esta tabela consolida receitas e despesas por feira e período
-- O campo 'period' representa o mês/ano de referência
-- 'netBalance' é calculado automaticamente (totalRevenue - totalExpenses)
-- 'profitMargin' é calculado automaticamente ((netBalance / totalRevenue) * 100)
-- Índices otimizam consultas por feira, período e análise de lucratividade
