# Endpoint Unificado de Visitantes

## Visão Geral

O endpoint `GET /visitors` foi unificado para suportar todas as funcionalidades:
- Listagem básica (comportamento original)
- Busca com relevância/ranking
- Paginação
- Combinação de todas as funcionalidades

## Como Funciona

### 1. **Sem Parâmetros** (Comportamento Original)
```
GET /visitors?fairId=123
```
- Retorna todos os visitantes da feira
- Usa a lógica original (mais rápida)
- Formato: `Array<Visitor>`

### 2. **Apenas Busca** (Compatibilidade com Frontend Atual)
```
GET /visitors?fairId=123&search=teste
GET /visitors?fairId=123&search=teste&searchField=name
```
- Aplica busca com ranking de relevância (0-100 pontos)
- Retorna até 1000 resultados ordenados por relevância
- Formato: `Array<Visitor>` (mantém compatibilidade)

### 3. **Busca + Paginação** (Nova Funcionalidade)
```
GET /visitors?fairId=123&search=teste&page=1&limit=20
```
- Aplica busca com ranking + paginação
- Formato: `PaginatedResponse<Visitor>` com metadata

### 4. **Apenas Paginação** (Sem Busca)
```
GET /visitors?fairId=123&page=1&limit=20
```
- Paginação simples sem busca/ranking
- Formato: `PaginatedResponse<Visitor>` com metadata

## Parâmetros Suportados

| Parâmetro | Obrigatório | Padrão | Descrição |
|-----------|-------------|--------|-----------|
| `fairId` | ✅ | - | ID da feira |
| `search` | ❌ | - | Termo de busca |
| `searchField` | ❌ | `all` | Campo específico para buscar |
| `page` | ❌ | `1` | Página atual |
| `limit` | ❌ | `50` / `1000`* | Itens por página |
| `sortBy` | ❌ | `name` | Campo para ordenação |
| `sortOrder` | ❌ | `asc` | Direção da ordenação |

*\* Quando há busca sem page/limit, usa 1000 para retornar todos os resultados*

## Lógica de Decisão

```typescript
if (search || page || limit) {
  // USA FUNCIONALIDADES AVANÇADAS
  if (search && !page && !limit) {
    // Busca simples: retorna Array<Visitor>
    return result.data;
  } else {
    // Busca + paginação: retorna PaginatedResponse<Visitor>
    return result;
  }
} else {
  // USA LÓGICA ORIGINAL (mais rápida)
  return originalVisitors;
}
```

## Exemplos de Uso

### Frontend Atual (não precisa mudar)
```javascript
// Continua funcionando exatamente igual
const response = await fetch('/api/visitors?fairId=123&search=teste');
const visitors = await response.json(); // Array<Visitor>
```

### Novo Frontend com Paginação
```javascript
const response = await fetch('/api/visitors?fairId=123&search=teste&page=1&limit=20');
const result = await response.json(); // PaginatedResponse<Visitor>
const visitors = result.data;
const totalPages = result.meta.totalPages;
```

## Sistema de Relevância

Quando há busca (`search`), os resultados são ordenados por relevância:

- **100 pontos**: Correspondência exata
- **85-75 pontos**: Inicia com o termo
- **70-60 pontos**: Contém o termo
- **55 pontos**: Números (telefone/CNPJ) que contêm o termo

## Campos de Busca Suportados

- `all` (padrão): Busca em todos os campos
- `name`: Apenas no nome
- `email`: Apenas no email
- `company`: Apenas na empresa
- `phone`: Apenas no telefone
- `registrationCode`: Apenas no código de registro

## Vantagens da Unificação

1. **Compatibilidade Total**: Frontend atual continua funcionando
2. **Performance**: Usa lógica otimizada quando não há busca
3. **Flexibilidade**: Suporta desde busca simples até paginação avançada
4. **Manutenibilidade**: Um único endpoint para manter
5. **Escalabilidade**: Suporta crescimento futuro das funcionalidades
