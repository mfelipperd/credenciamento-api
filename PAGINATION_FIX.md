# Correção da Paginação - Visitors Endpoint

## Problema Identificado
O endpoint GET `/visitors` estava retornando apenas um array simples (sem metadados de paginação) quando os parâmetros `page=1` e `limit=50` eram enviados, mesmo que fossem valores explicitamente fornecidos pelo cliente.

## Comportamento Anterior (Problemático)
```typescript
// Lógica problemática no controller
if (dto.search || dto.page !== 1 || dto.limit !== 50) {
  if (dto.search && dto.page === 1 && dto.limit === 50) {
    // ❌ Retornava só dados sem metadata quando page=1 e limit=50
    return result.data; 
  }
}
```

## Resposta Problemática
Quando chamado: `GET /visitors?fairId=xxx&page=1&limit=50&sortBy=name&sortOrder=asc`

**Retornava:**
```json
[
  {
    "registrationCode": "00471771-d51b-43ec-8fb2-f5dde507f57e",
    "name": "Silmara Aparecida Bertozzi de Oliveira",
    ...
  }
]
```

## Solução Implementada
Nova lógica que detecta quando **qualquer** parâmetro de paginação é enviado explicitamente:

```typescript
// Nova lógica corrigida
const hasSearchParams = dto.search && dto.search.trim().length > 0;
const hasPaginationParams =
  dto.page !== undefined ||
  dto.limit !== undefined ||
  dto.sortBy !== undefined ||
  dto.sortOrder !== undefined;

if (hasSearchParams || hasPaginationParams) {
  // ✅ Sempre retorna formato paginado completo
  return await this.visitorsService.getVisitorsPaginated(req.user, dto);
}
```

## Resposta Corrigida
Agora quando chamado: `GET /visitors?fairId=xxx&page=1&limit=50&sortBy=name&sortOrder=asc`

**Retorna:**
```json
{
  "data": [
    {
      "registrationCode": "00471771-d51b-43ec-8fb2-f5dde507f57e",
      "name": "Silmara Aparecida Bertozzi de Oliveira",
      ...
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Comportamento do Endpoint Agora

### 1. Chamada Simples (sem parâmetros)
`GET /visitors?fairId=xxx` → Retorna array simples (compatibilidade)

### 2. Chamada com Parâmetros de Paginação
`GET /visitors?fairId=xxx&page=1&limit=50` → Retorna formato paginado completo

### 3. Chamada com Busca
`GET /visitors?fairId=xxx&search=teste` → Retorna formato paginado completo

### 4. Chamada com Ordenação
`GET /visitors?fairId=xxx&sortBy=name&sortOrder=asc` → Retorna formato paginado completo

## Status
✅ **Corrigido** - A paginação agora funciona corretamente em todos os casos
✅ **Compilação** - Projeto compila sem erros
✅ **Compatibilidade** - Mantida compatibilidade com chamadas simples

Data da correção: 6 de agosto de 2025
