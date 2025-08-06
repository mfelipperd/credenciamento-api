# API de Paginação de Visitantes

## Endpoint

```
GET /api/visitors/paginated
```

## Parâmetros de Query

### Obrigatório

- `fairId` (string): ID da feira

### Opcionais

- `page` (number): Número da página (padrão: 1, mínimo: 1)
- `limit` (number): Itens por página (padrão: 50, máximo: 100)
- `search` (string): Termo de busca inteligente
- `searchField` (string): Campo específico para busca
  - Valores permitidos: `all`, `name`, `email`, `company`, `phone`, `registrationCode`
  - Padrão: `all`
- `sortBy` (string): Campo para ordenação
  - Valores permitidos: `name`, `email`, `company`, `registrationDate`, `registrationCode`
  - Padrão: `name`
- `sortOrder` (string): Ordem da classificação
  - Valores permitidos: `asc`, `desc`
  - Padrão: `asc`

## 🔍 Busca Inteligente Melhorada

A nova funcionalidade de busca é muito mais precisa:

### **Busca em Todos os Campos (searchField=all)**

- **Código de Registro**: Reconhece automaticamente padrões como "abc123" e faz busca exata
- **Email**: Detecta "@" e prioriza busca em emails
- **Múltiplas Palavras**: "João Silva" busca registros que contenham AMBAS as palavras
- **Busca Geral**: Pesquisa em nome, email, empresa, telefone e código

### **Busca por Campo Específico**

```typescript
// Buscar apenas em nomes
'?searchField=name&search=João Silva';

// Buscar apenas em emails
'?searchField=email&search=joao@empresa.com';

// Buscar apenas em empresas
'?searchField=company&search=Microsoft';

// Buscar código exato
'?searchField=registrationCode&search=ABC123';

// Buscar telefone
'?searchField=phone&search=11999887766';
```

## Exemplo de Request

```typescript
// Busca inteligente geral
const response1 = await fetch(
  '/api/visitors/paginated?fairId=123&search=joão silva',
);

// Busca específica por email
const response2 = await fetch(
  '/api/visitors/paginated?fairId=123&search=joao@empresa.com&searchField=email',
);

// Busca por código de registro exato
const response3 = await fetch(
  '/api/visitors/paginated?fairId=123&search=ABC123&searchField=registrationCode',
);

// Busca complexa com paginação e ordenação
const response4 = await fetch(
  '/api/visitors/paginated?fairId=123&page=2&limit=20&search=Microsoft&searchField=company&sortBy=registrationDate&sortOrder=desc',
);
```

## Resposta da API

```typescript
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number; // Total de registros
    page: number; // Página atual
    limit: number; // Itens por página
    totalPages: number; // Total de páginas
    hasNext: boolean; // Tem próxima página?
    hasPrev: boolean; // Tem página anterior?
  };
}
```

## Exemplo de Resposta

```json
{
  "data": [
    {
      "id": 1,
      "name": "João Silva",
      "email": "joao@empresa.com",
      "company": "Empresa ABC",
      "registrationCode": "abc123",
      "registrationDate": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 250,
    "page": 2,
    "limit": 20,
    "totalPages": 13,
    "hasNext": true,
    "hasPrev": true
  }
}
```

## Implementação no Frontend (React/Next.js)

```tsx
import { useState, useEffect } from 'react';

interface VisitorsPaginatedParams {
  fairId: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const useVisitorsPaginated = (params: VisitorsPaginatedParams) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchVisitors = async () => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams({
        fairId: params.fairId,
        page: params.page?.toString() || '1',
        limit: params.limit?.toString() || '50',
        ...(params.search && { search: params.search }),
        ...(params.sortBy && { sortBy: params.sortBy }),
        ...(params.sortOrder && { sortOrder: params.sortOrder }),
      });

      const response = await fetch(`/api/visitors/paginated?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch visitors');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, [
    params.fairId,
    params.page,
    params.limit,
    params.search,
    params.sortBy,
    params.sortOrder,
  ]);

  return { data, loading, error, refetch: fetchVisitors };
};

// Componente de exemplo com busca melhorada
const VisitorsList = ({ fairId }) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const { data, loading, error } = useVisitorsPaginated({
    fairId,
    page,
    search,
    searchField,
    sortBy,
    sortOrder,
    limit: 25,
  });

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;
  if (!data) return <div>Sem dados</div>;

  return (
    <div>
      {/* Controles de busca melhorados */}
      <div className="search-controls">
        <input
          type="text"
          placeholder="Buscar visitantes..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1); // Reset para primeira página ao buscar
          }}
        />

        <select
          value={searchField}
          onChange={(e) => {
            setSearchField(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">🔍 Buscar em tudo</option>
          <option value="name">👤 Apenas nomes</option>
          <option value="email">📧 Apenas emails</option>
          <option value="company">🏢 Apenas empresas</option>
          <option value="phone">📱 Apenas telefones</option>
          <option value="registrationCode">🎫 Apenas códigos</option>
        </select>
      </div>

      {/* Dicas de busca */}
      <div className="search-tips">
        {searchField === 'all' && (
          <small>
            💡 Dicas: Digite "João Silva" para buscar ambas palavras,
            "joao@email.com" para buscar emails, ou "ABC123" para códigos
          </small>
        )}
        {searchField === 'name' && (
          <small>💡 Digite nome completo ou parte dele</small>
        )}
        {searchField === 'registrationCode' && (
          <small>💡 Digite o código exato do visitante</small>
        )}
      </div>

      {/* Ordenação */}
      <select
        value={`${sortBy}-${sortOrder}`}
        onChange={(e) => {
          const [field, order] = e.target.value.split('-');
          setSortBy(field);
          setSortOrder(order);
        }}
      >
        <option value="name-asc">Nome (A-Z)</option>
        <option value="name-desc">Nome (Z-A)</option>
        <option value="registrationDate-desc">Mais Recentes</option>
        <option value="registrationDate-asc">Mais Antigos</option>
        <option value="company-asc">Empresa (A-Z)</option>
      </select>

      {/* Resultados da busca */}
      {search && (
        <div className="search-results-info">
          Encontrados {data.meta.total} visitantes para "{search}"
          {searchField !== 'all' && ` em ${searchField}`}
        </div>
      )}

      {/* Lista de visitantes */}
      <div>
        {data.data.map((visitor) => (
          <div key={visitor.registrationCode} className="visitor-card">
            <strong>{visitor.name}</strong>
            <br />
            📧 {visitor.email}
            <br />
            🏢 {visitor.company || 'Sem empresa'}
            <br />
            🎫 {visitor.registrationCode}
          </div>
        ))}
      </div>

      {/* Paginação */}
      <div>
        <button disabled={!data.meta.hasPrev} onClick={() => setPage(page - 1)}>
          Anterior
        </button>

        <span>
          Página {data.meta.page} de {data.meta.totalPages}({data.meta.total}{' '}
          visitantes)
        </span>

        <button disabled={!data.meta.hasNext} onClick={() => setPage(page + 1)}>
          Próximo
        </button>
      </div>
    </div>
  );
};
```

## Benefícios da Implementação

1. **Performance**: Carrega apenas os dados necessários
2. **UX**: Interface responsiva mesmo com milhares de registros
3. **Busca Inteligente**:
   - 🎯 Reconhece automaticamente tipos de dados (emails, códigos, nomes)
   - 🔍 Busca por múltiplas palavras (deve conter todas)
   - 📧 Prioriza campos relevantes baseado no contexto
   - 🏢 Busca específica por campo quando necessário
4. **Ordenação**: Múltiplas opções de classificação
5. **Autorização**: Mantém as regras de acesso por papel de usuário
6. **Escalabilidade**: Suporta qualquer volume de dados
7. **Precisão**: Busca muito mais precisa que a anterior

## Exemplos de Casos de Uso da Busca

```typescript
// ✅ Buscar visitante específico por nome completo
'?search=João Silva Santos&searchField=name';

// ✅ Encontrar visitante por email
'?search=joao.silva@empresa.com&searchField=email';

// ✅ Listar todos da Microsoft
'?search=Microsoft&searchField=company';

// ✅ Buscar por código de registro
'?search=REG001234&searchField=registrationCode';

// ✅ Busca inteligente - detecta automaticamente
'?search=joao@email.com'; // Detecta email automaticamente
'?search=ABC123'; // Detecta código automaticamente
'?search=João Silva'; // Busca ambas palavras
```

## Considerações Importantes

- O endpoint mantém todas as regras de autorização existentes
- A busca é case-insensitive e usa ILIKE (PostgreSQL/MySQL)
- O limite máximo é 100 itens por página para evitar sobrecarga
- Os campos de ordenação são validados para prevenir SQL injection
- Para consultores, apenas feiras autorizadas são retornadas
