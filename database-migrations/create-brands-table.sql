-- Criação da tabela de marcas associadas aos clientes dos stands
CREATE TABLE IF NOT EXISTS `finance_brands` (
  `id` varchar(36) NOT NULL,
  `clientId` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `logoUrl` varchar(500) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_finance_brands_clientId` (`clientId`),
  CONSTRAINT `FK_finance_brands_clientId` FOREIGN KEY (`clientId`) REFERENCES `finance_clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
