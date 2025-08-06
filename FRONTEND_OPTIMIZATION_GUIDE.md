# Guia de Otimização Completa do Frontend

## 1. Hook Customizado Avançado com Debounce

```tsx
import { useState, useEffect, useMemo } from 'react';
import { debounce } from 'lodash';

interface UseVisitorsPaginatedOptions {
  fairId: string;
  initialLimit?: number;
  debounceMs?: number;
}

export const useVisitorsPaginated = ({
  fairId,
  initialLimit = 50,
  debounceMs = 300,
}: UseVisitorsPaginatedOptions) => {
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
  });

  const [filters, setFilters] = useState({
    page: 1,
    limit: initialLimit,
    search: '',
    sortBy: 'name',
    sortOrder: 'asc' as 'asc' | 'desc',
  });

  // Debounce da busca para evitar requests excessivos
  const debouncedFetch = useMemo(
    () =>
      debounce(async (searchParams) => {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        try {
          const params = new URLSearchParams({
            fairId,
            ...searchParams,
          });

          const response = await fetch(`/api/visitors/paginated?${params}`);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();
          setState({ data: result, loading: false, error: null });
        } catch (err) {
          setState({
            data: null,
            loading: false,
            error: err.message,
          });
        }
      }, debounceMs),
    [fairId, debounceMs],
  );

  useEffect(() => {
    debouncedFetch({
      page: filters.page.toString(),
      limit: filters.limit.toString(),
      search: filters.search,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });

    return () => {
      debouncedFetch.cancel();
    };
  }, [debouncedFetch, filters]);

  const updateFilters = (updates) => {
    setFilters((prev) => ({
      ...prev,
      ...updates,
      // Reset page quando muda busca ou ordenação
      page:
        updates.search !== undefined ||
        updates.sortBy !== undefined ||
        updates.sortOrder !== undefined
          ? 1
          : prev.page,
    }));
  };

  return {
    ...state,
    filters,
    updateFilters,
    // Helpers
    nextPage: () => updateFilters({ page: filters.page + 1 }),
    prevPage: () => updateFilters({ page: filters.page - 1 }),
    setSearch: (search) => updateFilters({ search }),
    setSort: (sortBy, sortOrder) => updateFilters({ sortBy, sortOrder }),
  };
};
```

## 2. Componente de Tabela Otimizada

```tsx
import React, { memo } from 'react';
import { formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Memoizar linha individual para evitar re-renders desnecessários
const VisitorRow = memo(({ visitor, onEdit, onDelete }) => (
  <tr>
    <td>{visitor.registrationCode}</td>
    <td>{visitor.name}</td>
    <td>{visitor.email}</td>
    <td>{visitor.company || '-'}</td>
    <td>
      {formatDistance(new Date(visitor.registrationDate), new Date(), {
        locale: ptBR,
        addSuffix: true,
      })}
    </td>
    <td>
      <button onClick={() => onEdit(visitor)}>Editar</button>
      <button onClick={() => onDelete(visitor)}>Excluir</button>
    </td>
  </tr>
));

// Componente principal com otimizações
export const OptimizedVisitorsTable = ({ fairId }) => {
  const {
    data,
    loading,
    error,
    filters,
    updateFilters,
    nextPage,
    prevPage,
    setSearch,
    setSort,
  } = useVisitorsPaginated({ fairId });

  // Estados locais para controles
  const [selectedSort, setSelectedSort] = useState('name-asc');

  // Handlers otimizados
  const handleSortChange = useCallback(
    (value) => {
      const [sortBy, sortOrder] = value.split('-');
      setSelectedSort(value);
      setSort(sortBy, sortOrder);
    },
    [setSort],
  );

  const handleSearchChange = useCallback(
    (e) => {
      setSearch(e.target.value);
    },
    [setSearch],
  );

  if (error) {
    return (
      <div className="error-state">
        <p>Erro ao carregar visitantes: {error}</p>
        <button onClick={() => window.location.reload()}>
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="visitors-table-container">
      {/* Controles */}
      <div className="table-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar por nome, email, empresa ou código..."
            value={filters.search}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>

        <div className="sort-controls">
          <select
            value={selectedSort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="sort-select"
          >
            <option value="name-asc">Nome (A-Z)</option>
            <option value="name-desc">Nome (Z-A)</option>
            <option value="registrationDate-desc">Mais Recentes</option>
            <option value="registrationDate-asc">Mais Antigos</option>
            <option value="company-asc">Empresa (A-Z)</option>
            <option value="company-desc">Empresa (Z-A)</option>
            <option value="email-asc">Email (A-Z)</option>
          </select>
        </div>

        <div className="limit-controls">
          <select
            value={filters.limit}
            onChange={(e) => updateFilters({ limit: parseInt(e.target.value) })}
            className="limit-select"
          >
            <option value={25}>25 por página</option>
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Carregando...</div>
        </div>
      )}

      {/* Tabela */}
      {data && (
        <>
          <div className="table-info">
            <span>
              Exibindo {data.data.length} de {data.meta.total} visitantes
            </span>
          </div>

          <table className="visitors-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome</th>
                <th>Email</th>
                <th>Empresa</th>
                <th>Cadastro</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((visitor) => (
                <VisitorRow
                  key={visitor.registrationCode}
                  visitor={visitor}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>

          {/* Paginação Avançada */}
          <PaginationControls
            currentPage={data.meta.page}
            totalPages={data.meta.totalPages}
            hasNext={data.meta.hasNext}
            hasPrev={data.meta.hasPrev}
            onPageChange={(page) => updateFilters({ page })}
            onNext={nextPage}
            onPrev={prevPage}
          />
        </>
      )}
    </div>
  );
};
```

## 3. Componente de Paginação Avançada

```tsx
const PaginationControls = memo(
  ({
    currentPage,
    totalPages,
    hasNext,
    hasPrev,
    onPageChange,
    onNext,
    onPrev,
  }) => {
    // Gerar números de páginas a mostrar
    const getPageNumbers = () => {
      const delta = 2; // Páginas antes e depois da atual
      const range = [];

      for (
        let i = Math.max(2, currentPage - delta);
        i <= Math.min(totalPages - 1, currentPage + delta);
        i++
      ) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        range.unshift('...');
      }
      if (currentPage + delta < totalPages - 1) {
        range.push('...');
      }

      range.unshift(1);
      if (totalPages > 1) {
        range.push(totalPages);
      }

      return range;
    };

    return (
      <div className="pagination-controls">
        <button disabled={!hasPrev} onClick={onPrev} className="pagination-btn">
          ← Anterior
        </button>

        <div className="page-numbers">
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={page === '...'}
              className={`page-btn ${currentPage === page ? 'active' : ''}`}
            >
              {page}
            </button>
          ))}
        </div>

        <button disabled={!hasNext} onClick={onNext} className="pagination-btn">
          Próximo →
        </button>

        <div className="pagination-info">
          Página {currentPage} de {totalPages}
        </div>
      </div>
    );
  },
);
```

## 4. CSS Otimizado

```css
.visitors-table-container {
  position: relative;
  min-height: 400px;
}

.table-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  min-width: 300px;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.visitors-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}

.visitors-table th,
.visitors-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.visitors-table th {
  background-color: #f8f9fa;
  font-weight: 600;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.page-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 4px;
}

.page-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsividade */
@media (max-width: 768px) {
  .table-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    min-width: auto;
  }

  .visitors-table {
    font-size: 0.875rem;
  }

  .pagination-controls {
    flex-direction: column;
    gap: 1rem;
  }
}
```

## 5. Cache e Performance Adicional

```tsx
// Context para cache global
const VisitorsCache = createContext();

export const VisitorsCacheProvider = ({ children }) => {
  const [cache, setCache] = useState(new Map());

  const getCached = useCallback(
    (key) => {
      const cached = cache.get(key);
      if (!cached) return null;

      // Cache válido por 5 minutos
      if (Date.now() - cached.timestamp > 5 * 60 * 1000) {
        cache.delete(key);
        return null;
      }

      return cached.data;
    },
    [cache],
  );

  const setCache = useCallback((key, data) => {
    setCache((prev) =>
      new Map(prev).set(key, {
        data,
        timestamp: Date.now(),
      }),
    );
  }, []);

  return (
    <VisitorsCache.Provider value={{ getCached, setCache }}>
      {children}
    </VisitorsCache.Provider>
  );
};

// Hook com cache
export const useVisitorsPaginatedWithCache = (options) => {
  const { getCached, setCache } = useContext(VisitorsCache);

  // ... resto da implementação com cache
};
```

## Resultados Esperados

Com essas otimizações, você deve ver:

1. **Carregamento inicial**: < 200ms
2. **Busca em tempo real**: Debounce evita requisições excessivas
3. **Navegação**: Instantânea entre páginas já visitadas (cache)
4. **Responsividade**: Interface nunca trava, mesmo com 10k+ registros
5. **UX**: Loading states e feedback visual adequados

## Monitoramento de Performance

```tsx
// Hook para medir performance
const usePerformanceMonitor = () => {
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.includes('/api/visitors')) {
          console.log(`API ${entry.name}: ${entry.duration}ms`);
        }
      });
    });

    observer.observe({ entryTypes: ['measure', 'navigation'] });

    return () => observer.disconnect();
  }, []);
};
```
