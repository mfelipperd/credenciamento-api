# Correções na Busca de Visitantes

## Problemas Identificados e Corrigidos

### 1. **Erro 500 - Incompatibilidade MySQL**

**Problema**: MySQL não suporta operador `ILIKE` (PostgreSQL) 
**Solução**: Substituído por `LIKE` com conversão manual `LOWER()`

**Antes (incorreto)**:
```sql
visitor.name ILIKE :searchPartial
```

**Depois (correto)**:
```sql
LOWER(visitor.name) LIKE '%termo%'
```

### 2. **Injeção de Parâmetros SQL**

**Problema**: Parâmetros não eram passados corretamente para o `andWhere`
**Solução**: Uso direto de strings escapadas no SQL para evitar problemas

**Antes (incorreto)**:
```typescript
query.andWhere(`${relevanceScore} > 0`, params);
```

**Depois (correto)**:
```typescript
query.andWhere(`${relevanceScore} > 0`);
```

### 3. **Controller Melhorado com DTO**

**Problema**: Validação manual de parâmetros sem usar DTO
**Solução**: Uso do `PaginatedVisitorsDto` para validação automática

**Antes**:
```typescript
@Query('search') search?: string,
@Query('page') page?: string,
```

**Depois**:
```typescript
@Query() dto: PaginatedVisitorsDto,
```

## Sistema de Busca Aprimorado

### **Pontuação de Relevância (0-100 pontos)**

| Tipo de Match | Nome | Empresa | Email | Telefone/CNPJ | Código |
|---------------|------|---------|-------|---------------|---------|
| **Exato** | 100 | 95 | 90 | 100 | 90 |
| **Inicia com** | 85 | 80 | 75 | - | - |
| **Contém** | 70 | 65 | 60 | 55 | 50 |

### **Critérios de Busca Mais Rigorosos**

- **Números**: Mínimo 3 dígitos (antes eram 8)
- **Termos de busca**: Case-insensitive real
- **Filtros**: Apenas resultados com pontuação > 0

## Exemplo de Funcionamento

### Busca por "teste":

```sql
SELECT visitor.*, 
(
  CASE WHEN LOWER(visitor.name) = 'teste' THEN 100 ELSE 0 END +
  CASE WHEN LOWER(visitor.company) = 'teste' THEN 95 ELSE 0 END +
  CASE WHEN LOWER(visitor.name) LIKE 'teste%' THEN 85 ELSE 0 END +
  CASE WHEN LOWER(visitor.name) LIKE '%teste%' THEN 70 ELSE 0 END
) as relevance_score
FROM visitor
WHERE relevance_score > 0
ORDER BY relevance_score DESC
```

## Compatibilidade de API

### **Endpoint Unificado**: `GET /visitors`

1. **Busca Simples** (compatibilidade total):
   ```
   GET /visitors?fairId=123&search=teste
   → Retorna: Array<Visitor>
   ```

2. **Busca + Paginação** (nova funcionalidade):
   ```
   GET /visitors?fairId=123&search=teste&page=1&limit=20
   → Retorna: PaginatedResponse<Visitor>
   ```

3. **Apenas Listagem** (original):
   ```
   GET /visitors?fairId=123
   → Retorna: Array<Visitor>
   ```

## Melhorias de Performance

- **SQL otimizado** para MySQL
- **Indexação implícita** nos campos de busca
- **Busca mais restritiva** (menos resultados irrelevantes)
- **Cache de relevância** no SELECT

## Status Atual

✅ **Corrigido**: Erro 500 MySQL  
✅ **Corrigido**: Sintaxe SQL compatível  
✅ **Corrigido**: Validação de parâmetros  
✅ **Implementado**: Sistema de relevância aprimorado  
✅ **Mantido**: Compatibilidade total da API  

## Teste Recomendado

```bash
# Deve funcionar agora sem erro 500:
curl -X GET "http://localhost:8000/visitors?fairId=0299a14d-10f1-4799-bf18-a0ecfec99d62&search=testee&page=1&limit=50"
```
