# 🔄 Migração Segura: Users ID numérico → UUID

## ⚠️ **IMPORTANTE: Faça backup antes de executar!**

```sql
-- 1. BACKUP COMPLETO (OBRIGATÓRIO)
CREATE TABLE `users_backup_$(date +%Y%m%d_%H%M%S)` AS SELECT * FROM `users`;
```

## 📋 **Passo a Passo Seguro**

### **Passo 1: Verificar dados existentes**
```sql
-- Ver quantos usuários existem
SELECT COUNT(*) as total_users FROM `users`;

-- Ver estrutura atual
DESCRIBE `users`;

-- Ver alguns registros
SELECT id, name, email, role FROM `users` LIMIT 5;
```

### **Passo 2: Criar nova tabela**
```sql
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
```

### **Passo 3: Migrar dados**
```sql
INSERT INTO `users_new` (
  `id`, `name`, `email`, `password`, `role`, `isActive`, `createdAt`
)
SELECT 
  UUID() as `id`,
  `name`,
  `email`, 
  `password`,
  `role`,
  1 as `isActive`,
  `createdAt`
FROM `users`;
```

### **Passo 4: Verificar migração**
```sql
-- Comparar contagens
SELECT 
  (SELECT COUNT(*) FROM `users`) as original_count,
  (SELECT COUNT(*) FROM `users_new`) as new_count;

-- Verificar alguns registros
SELECT id, name, email, role FROM `users_new` LIMIT 5;
```

### **Passo 5: Fazer o swap (CUIDADO!)**
```sql
-- Renomear tabelas
RENAME TABLE 
  `users` TO `users_old`, 
  `users_new` TO `users`;
```

### **Passo 6: Testar aplicação**
- Rodar a aplicação
- Testar login
- Verificar se tudo funciona

### **Passo 7: Limpeza (apenas se tudo estiver funcionando)**
```sql
-- Remover tabelas antigas (CUIDADO!)
-- DROP TABLE `users_old`;
-- DROP TABLE `users_backup_$(date)`;
```

## 🔄 **Rollback (se algo der errado)**

```sql
-- Restaurar tabela original
RENAME TABLE `users` TO `users_broken`, `users_old` TO `users`;

-- Ou restaurar do backup
-- DROP TABLE `users`;
-- RENAME TABLE `users_backup_$(date)` TO `users`;
```

## ✅ **Verificações Pós-Migração**

1. **Contagem de usuários**: Deve ser igual
2. **Login funciona**: Testar com usuários existentes
3. **Dados íntegros**: Verificar se não perdeu nada
4. **Aplicação roda**: Sem erros de conexão

## 🚨 **Se algo der errado**

1. **NÃO entre em pânico**
2. **Use o rollback** imediatamente
3. **Verifique os logs** de erro
4. **Restaure do backup** se necessário
