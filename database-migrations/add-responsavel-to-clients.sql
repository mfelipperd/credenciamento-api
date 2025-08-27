-- Migração para adicionar campo responsavel na tabela finance_clients
-- Data: 2025-01-31

USE credenciamento_api;

-- Adicionar coluna responsavel na tabela finance_clients
ALTER TABLE finance_clients 
ADD COLUMN responsavel VARCHAR(255) NULL 
COMMENT 'Nome do responsável pelo cliente';

-- Criar índice para melhorar performance de consultas por responsável
CREATE INDEX idx_finance_clients_responsavel ON finance_clients(responsavel);

-- Verificar se a coluna foi criada corretamente
DESCRIBE finance_clients;
