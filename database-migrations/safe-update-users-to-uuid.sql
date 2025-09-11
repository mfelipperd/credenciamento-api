-- MIGRAÇÃO SEGURA: Converter tabela users de ID numérico para UUID
-- Esta migração preserva todos os dados existentes

-- 1. Fazer backup da tabela original
CREATE TABLE `users_backup` AS SELECT * FROM `users`;

-- 2. Criar nova tabela com estrutura UUID
CREATE TABLE `users_new` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','receptionist','consultant','partner') NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `cpf` varchar(14) NULL,
  `phone` varchar(20) NULL,
  `notes` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Migrar dados existentes (gerando novos UUIDs)
INSERT INTO `users_new` (
  `id`, `name`, `email`, `password`, `role`, `isActive`, `cpf`, `phone`, `notes`, `createdAt`
)
SELECT 
  UUID() as `id`,
  `name`,
  `email`, 
  `password`,
  `role`,
  1 as `isActive`,  -- Todos ativos por padrão
  NULL as `cpf`,    -- Será preenchido depois
  NULL as `phone`,  -- Será preenchido depois
  NULL as `notes`,  -- Será preenchido depois
  `createdAt`
FROM `users`;

-- 4. Renomear tabelas (swap)
RENAME TABLE `users` TO `users_old`, `users_new` TO `users`;

-- 5. Verificar se a migração funcionou
SELECT COUNT(*) as total_users FROM `users`;
SELECT COUNT(*) as backup_users FROM `users_backup`;

-- 6. Se tudo estiver correto, você pode remover o backup depois:
-- DROP TABLE `users_backup`;
-- DROP TABLE `users_old`;
