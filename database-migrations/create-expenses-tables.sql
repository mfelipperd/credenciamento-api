-- Migration para criar as tabelas do módulo de despesas
-- Data: 2025-01-31

-- 1. Tabela de categorias financeiras
CREATE TABLE IF NOT EXISTS `finance_categories` (
  `id` char(36) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `parentId` char(36) DEFAULT NULL,
  `global` tinyint(1) NOT NULL DEFAULT 1,
  `fairId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_finance_categories_parentId` (`parentId`),
  KEY `IDX_finance_categories_fairId` (`fairId`),
  KEY `IDX_finance_categories_global` (`global`),
  CONSTRAINT `FK_finance_categories_parent` FOREIGN KEY (`parentId`) REFERENCES `finance_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_finance_categories_fair` FOREIGN KEY (`fairId`) REFERENCES `fairs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela de contas bancárias
CREATE TABLE IF NOT EXISTS `finance_accounts` (
  `id` char(36) NOT NULL,
  `nomeConta` varchar(255) NOT NULL,
  `banco` varchar(255) DEFAULT NULL,
  `tipo` enum('corrente','poupanca','outro') NOT NULL DEFAULT 'corrente',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IDX_finance_accounts_tipo` (`tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de despesas
CREATE TABLE IF NOT EXISTS `finance_expenses` (
  `id` char(36) NOT NULL,
  `fairId` char(36) NOT NULL,
  `categoryId` char(36) NOT NULL,
  `accountId` char(36) NOT NULL,
  `descricao` varchar(500) DEFAULT NULL,
  `valor` decimal(10,2) NOT NULL,
  `data` date NOT NULL,
  `observacoes` text DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IDX_finance_expenses_fairId_data` (`fairId`, `data`),
  KEY `IDX_finance_expenses_categoryId` (`categoryId`),
  KEY `IDX_finance_expenses_accountId` (`accountId`),
  CONSTRAINT `FK_finance_expenses_fair` FOREIGN KEY (`fairId`) REFERENCES `fairs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_finance_expenses_category` FOREIGN KEY (`categoryId`) REFERENCES `finance_categories` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_finance_expenses_account` FOREIGN KEY (`accountId`) REFERENCES `finance_accounts` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Inserir algumas categorias padrão
INSERT INTO `finance_categories` (`id`, `nome`, `global`) VALUES
(UUID(), 'Alimentação', 1),
(UUID(), 'Transporte', 1),
(UUID(), 'Hospedagem', 1),
(UUID(), 'Material de Escritório', 1),
(UUID(), 'Marketing e Publicidade', 1),
(UUID(), 'Equipamentos', 1),
(UUID(), 'Serviços Terceiros', 1),
(UUID(), 'Impostos e Taxas', 1),
(UUID(), 'Outros', 1);

-- 5. Inserir algumas contas padrão
INSERT INTO `finance_accounts` (`id`, `nomeConta`, `banco`, `tipo`) VALUES
(UUID(), 'Conta Corrente Principal', 'Banco Principal', 'corrente'),
(UUID(), 'Conta Poupança', 'Banco Principal', 'poupanca'),
(UUID(), 'Caixa', NULL, 'outro');
