-- Migração para converter tabela users de ID numérico para UUID
-- Execute este script no banco de dados antes de rodar a aplicação

-- 1. Adicionar nova coluna id_uuid temporária
ALTER TABLE `users` ADD COLUMN `id_uuid` varchar(36) NULL;

-- 2. Gerar UUIDs para todos os registros existentes
UPDATE `users` SET `id_uuid` = UUID() WHERE `id_uuid` IS NULL;

-- 3. Remover a chave primária atual
ALTER TABLE `users` DROP PRIMARY KEY;

-- 4. Renomear colunas
ALTER TABLE `users` CHANGE COLUMN `id` `id_old` int NOT NULL;
ALTER TABLE `users` CHANGE COLUMN `id_uuid` `id` varchar(36) NOT NULL;

-- 5. Adicionar nova chave primária
ALTER TABLE `users` ADD PRIMARY KEY (`id`);

-- 6. Adicionar novos campos
ALTER TABLE `users` ADD COLUMN `isActive` tinyint(1) NOT NULL DEFAULT 1;
ALTER TABLE `users` ADD COLUMN `cpf` varchar(14) NULL;
ALTER TABLE `users` ADD COLUMN `phone` varchar(20) NULL;
ALTER TABLE `users` ADD COLUMN `notes` text NULL;
ALTER TABLE `users` ADD COLUMN `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 7. Remover coluna antiga (opcional - pode manter para backup)
-- ALTER TABLE `users` DROP COLUMN `id_old`;

-- 8. Atualizar tabelas que referenciam users.id
-- Atualizar tabela visitors se existir
ALTER TABLE `visitors` MODIFY COLUMN `createdBy` varchar(36) NULL;

-- Atualizar tabela partners se existir
ALTER TABLE `partners` MODIFY COLUMN `userId` varchar(36) NOT NULL;

-- Atualizar tabela partner_withdrawals se existir
ALTER TABLE `partner_withdrawals` MODIFY COLUMN `partnerId` varchar(36) NOT NULL;

-- Atualizar tabela fair_partners se existir
ALTER TABLE `fair_partners` MODIFY COLUMN `partnerId` varchar(36) NOT NULL;
