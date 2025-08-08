# Finance Module - Exemplos de Código para Frontend

## 🚀 Cliente API (JavaScript/TypeScript)

### Configuração Base

```typescript
// api.ts
const API_BASE_URL = 'http://localhost:3000';

class FinanceAPI {
  private baseURL = `${API_BASE_URL}/finance`;

  // Helper para requisições
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro na requisição');
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // CLIENTES
  async getClients(search?: string): Promise<Client[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<Client[]>(`/clients${query}`);
  }

  async getClient(id: string): Promise<Client> {
    return this.request<Client>(`/clients/${id}`);
  }

  async createClient(data: CreateClientDto): Promise<Client> {
    return this.request<Client>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClient(id: string, data: UpdateClientDto): Promise<Client> {
    return this.request<Client>(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: string): Promise<void> {
    return this.request<void>(`/clients/${id}`, {
      method: 'DELETE',
    });
  }

  async getClientByEmail(email: string): Promise<Client | null> {
    return this.request<Client>(`/clients/email/${email}`);
  }

  async getClientByCnpj(cnpj: string): Promise<Client | null> {
    return this.request<Client>(`/clients/cnpj/${cnpj}`);
  }

  // MODELOS DE LANÇAMENTO
  async getEntryModels(type?: EntryModelType): Promise<EntryModel[]> {
    const query = type ? `?type=${type}` : '';
    return this.request<EntryModel[]>(`/entry-models${query}`);
  }

  async getEntryModel(id: string): Promise<EntryModel> {
    return this.request<EntryModel>(`/entry-models/${id}`);
  }

  async createEntryModel(data: CreateEntryModelDto): Promise<EntryModel> {
    return this.request<EntryModel>('/entry-models', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEntryModel(id: string, data: UpdateEntryModelDto): Promise<EntryModel> {
    return this.request<EntryModel>(`/entry-models/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteEntryModel(id: string): Promise<void> {
    return this.request<void>(`/entry-models/${id}`, {
      method: 'DELETE',
    });
  }

  // RECEITAS
  async getRevenues(): Promise<Revenue[]> {
    return this.request<Revenue[]>('/revenues');
  }

  async getRevenue(id: string): Promise<Revenue> {
    return this.request<Revenue>(`/revenues/${id}`);
  }

  async createRevenue(data: CreateRevenueDto): Promise<Revenue> {
    return this.request<Revenue>('/revenues', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRevenue(id: string, data: UpdateRevenueDto): Promise<Revenue> {
    return this.request<Revenue>(`/revenues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteRevenue(id: string): Promise<void> {
    return this.request<void>(`/revenues/${id}`, {
      method: 'DELETE',
    });
  }

  async getRevenuesByClient(clientId: string): Promise<Revenue[]> {
    return this.request<Revenue[]>(`/revenues/client/${clientId}`);
  }

  async getRevenuesByStatus(status: RevenueStatus): Promise<Revenue[]> {
    return this.request<Revenue[]>(`/revenues/status/${status}`);
  }
}

export const financeAPI = new FinanceAPI();
```

## 🎯 React Hooks

### Hook para Clientes

```typescript
// hooks/useClients.ts
import { useState, useEffect } from 'react';
import { financeAPI } from '../services/api';

export const useClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async (search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await financeAPI.getClients(search);
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const createClient = async (clientData: CreateClientDto) => {
    try {
      const newClient = await financeAPI.createClient(clientData);
      setClients(prev => [newClient, ...prev]);
      return newClient;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar cliente');
      throw err;
    }
  };

  const updateClient = async (id: string, clientData: UpdateClientDto) => {
    try {
      const updatedClient = await financeAPI.updateClient(id, clientData);
      setClients(prev => 
        prev.map(client => 
          client.id === id ? updatedClient : client
        )
      );
      return updatedClient;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar cliente');
      throw err;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      await financeAPI.deleteClient(id);
      setClients(prev => prev.filter(client => client.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar cliente');
      throw err;
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return {
    clients,
    loading,
    error,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
  };
};
```

### Hook para Receitas

```typescript
// hooks/useRevenues.ts
import { useState, useEffect } from 'react';
import { financeAPI } from '../services/api';

export const useRevenues = (autoFetch = true) => {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenues = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await financeAPI.getRevenues();
      setRevenues(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenuesByStatus = async (status: RevenueStatus) => {
    setLoading(true);
    setError(null);
    try {
      const data = await financeAPI.getRevenuesByStatus(status);
      setRevenues(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenuesByClient = async (clientId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await financeAPI.getRevenuesByClient(clientId);
      setRevenues(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const createRevenue = async (revenueData: CreateRevenueDto) => {
    try {
      const newRevenue = await financeAPI.createRevenue(revenueData);
      setRevenues(prev => [newRevenue, ...prev]);
      return newRevenue;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar receita');
      throw err;
    }
  };

  const updateRevenue = async (id: string, revenueData: UpdateRevenueDto) => {
    try {
      const updatedRevenue = await financeAPI.updateRevenue(id, revenueData);
      setRevenues(prev => 
        prev.map(revenue => 
          revenue.id === id ? updatedRevenue : revenue
        )
      );
      return updatedRevenue;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar receita');
      throw err;
    }
  };

  const deleteRevenue = async (id: string) => {
    try {
      await financeAPI.deleteRevenue(id);
      setRevenues(prev => prev.filter(revenue => revenue.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar receita');
      throw err;
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchRevenues();
    }
  }, [autoFetch]);

  return {
    revenues,
    loading,
    error,
    fetchRevenues,
    fetchRevenuesByStatus,
    fetchRevenuesByClient,
    createRevenue,
    updateRevenue,
    deleteRevenue,
  };
};
```

## 🧩 Componentes React

### Lista de Clientes

```tsx
// components/ClientsList.tsx
import React from 'react';
import { useClients } from '../hooks/useClients';

interface ClientsListProps {
  onClientSelect?: (client: Client) => void;
  searchable?: boolean;
}

export const ClientsList: React.FC<ClientsListProps> = ({
  onClientSelect,
  searchable = true
}) => {
  const { clients, loading, error, fetchClients } = useClients();
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleSearch = React.useCallback(
    (term: string) => {
      setSearchTerm(term);
      fetchClients(term || undefined);
    },
    [fetchClients]
  );

  if (loading) return <div>Carregando clientes...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div className="clients-list">
      {searchable && (
        <input
          type="text"
          placeholder="Buscar clientes..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
      )}
      
      <div className="clients-grid">
        {clients.map((client) => (
          <div
            key={client.id}
            className="client-card"
            onClick={() => onClientSelect?.(client)}
          >
            <h3>{client.name}</h3>
            {client.cnpj && <p>CNPJ: {client.cnpj}</p>}
            {client.email && <p>Email: {client.email}</p>}
            {client.phone && <p>Telefone: {client.phone}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Formulário de Cliente

```tsx
// components/ClientForm.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const clientSchema = yup.object({
  name: yup.string().required('Nome é obrigatório').max(255, 'Nome muito longo'),
  cnpj: yup.string().optional().matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido'),
  email: yup.string().optional().email('Email inválido'),
  phone: yup.string().optional(),
});

interface ClientFormProps {
  client?: Client;
  onSave: (client: CreateClientDto | UpdateClientDto) => Promise<void>;
  onCancel: () => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({
  client,
  onSave,
  onCancel
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<CreateClientDto>({
    resolver: yupResolver(clientSchema),
    defaultValues: client || {
      name: '',
      cnpj: '',
      email: '',
      phone: '',
    }
  });

  const onSubmit = async (data: CreateClientDto) => {
    try {
      await onSave(data);
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="client-form">
      <div className="form-group">
        <label htmlFor="name">Nome *</label>
        <input
          id="name"
          {...register('name')}
          className={errors.name ? 'error' : ''}
        />
        {errors.name && <span className="error-message">{errors.name.message}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="cnpj">CNPJ</label>
        <input
          id="cnpj"
          {...register('cnpj')}
          placeholder="00.000.000/0000-00"
          className={errors.cnpj ? 'error' : ''}
        />
        {errors.cnpj && <span className="error-message">{errors.cnpj.message}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          {...register('email')}
          className={errors.email ? 'error' : ''}
        />
        {errors.email && <span className="error-message">{errors.email.message}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="phone">Telefone</label>
        <input
          id="phone"
          {...register('phone')}
          placeholder="(11) 99999-9999"
          className={errors.phone ? 'error' : ''}
        />
        {errors.phone && <span className="error-message">{errors.phone.message}</span>}
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </button>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
};
```

### Dashboard de Receitas

```tsx
// components/RevenueDashboard.tsx
import React from 'react';
import { useRevenues } from '../hooks/useRevenues';
import { formatCurrency, getStatusColor } from '../utils/formatters';

export const RevenueDashboard: React.FC = () => {
  const { revenues, loading, error } = useRevenues();

  const metrics = React.useMemo(() => {
    if (!revenues.length) return null;

    const totalValue = revenues.reduce((sum, revenue) => sum + revenue.contractValue, 0);
    const byStatus = revenues.reduce((acc, revenue) => {
      acc[revenue.status] = (acc[revenue.status] || 0) + 1;
      return acc;
    }, {} as Record<RevenueStatus, number>);

    const paidValue = revenues
      .filter(r => r.status === 'PAGO')
      .reduce((sum, revenue) => sum + revenue.contractValue, 0);

    return {
      total: totalValue,
      byStatus,
      paidValue,
      pendingValue: totalValue - paidValue,
    };
  }, [revenues]);

  if (loading) return <div>Carregando dashboard...</div>;
  if (error) return <div>Erro: {error}</div>;
  if (!metrics) return <div>Nenhuma receita encontrada</div>;

  return (
    <div className="revenue-dashboard">
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Valor Total</h3>
          <p className="metric-value">{formatCurrency(metrics.total)}</p>
        </div>
        
        <div className="metric-card">
          <h3>Valor Pago</h3>
          <p className="metric-value success">{formatCurrency(metrics.paidValue)}</p>
        </div>
        
        <div className="metric-card">
          <h3>Valor Pendente</h3>
          <p className="metric-value warning">{formatCurrency(metrics.pendingValue)}</p>
        </div>
      </div>

      <div className="status-breakdown">
        <h3>Receitas por Status</h3>
        {Object.entries(metrics.byStatus).map(([status, count]) => (
          <div key={status} className="status-item">
            <span 
              className="status-indicator" 
              style={{ backgroundColor: getStatusColor(status as RevenueStatus) }}
            />
            <span>{status}: {count}</span>
          </div>
        ))}
      </div>

      <div className="recent-revenues">
        <h3>Receitas Recentes</h3>
        {revenues.slice(0, 5).map((revenue) => (
          <div key={revenue.id} className="revenue-item">
            <div>
              <strong>{revenue.client?.name}</strong>
              <br />
              <small>{revenue.entryModel?.name}</small>
            </div>
            <div className="revenue-value">
              {formatCurrency(revenue.contractValue)}
            </div>
            <div 
              className="revenue-status"
              style={{ color: getStatusColor(revenue.status) }}
            >
              {revenue.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## 🛠️ Utilitários

### Formatadores

```typescript
// utils/formatters.ts

export const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
};

export const formatCNPJ = (cnpj: string): string => {
  const digits = cnpj.replace(/\D/g, '');
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};

export const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }
  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  return phone;
};

export const getStatusColor = (status: RevenueStatus): string => {
  const colors = {
    PENDENTE: '#fbbf24',
    EM_ANDAMENTO: '#3b82f6',
    EM_ATRASO: '#ef4444',
    PAGO: '#10b981',
    CANCELADO: '#6b7280'
  };
  return colors[status] || '#6b7280';
};

export const getStatusLabel = (status: RevenueStatus): string => {
  const labels = {
    PENDENTE: 'Pendente',
    EM_ANDAMENTO: 'Em Andamento',
    EM_ATRASO: 'Em Atraso',
    PAGO: 'Pago',
    CANCELADO: 'Cancelado'
  };
  return labels[status] || status;
};
```

### Validadores

```typescript
// utils/validators.ts

export const validateCNPJ = (cnpj: string): boolean => {
  const digits = cnpj.replace(/\D/g, '');
  
  if (digits.length !== 14) return false;
  
  // Validação básica de CNPJ
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  const calculateDigit = (digits: string, weights: number[]): number => {
    const sum = digits
      .split('')
      .slice(0, weights.length)
      .reduce((acc, digit, index) => acc + parseInt(digit) * weights[index], 0);
    
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  
  const digit1 = calculateDigit(digits, weights1);
  const digit2 = calculateDigit(digits, weights2);
  
  return (
    parseInt(digits[12]) === digit1 &&
    parseInt(digits[13]) === digit2
  );
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
```

## 📱 Exemplo de Context Provider

```tsx
// contexts/FinanceContext.tsx
import React, { createContext, useContext, useReducer } from 'react';

interface FinanceState {
  clients: Client[];
  entryModels: EntryModel[];
  revenues: Revenue[];
  selectedClient: Client | null;
  selectedRevenue: Revenue | null;
}

type FinanceAction =
  | { type: 'SET_CLIENTS'; payload: Client[] }
  | { type: 'ADD_CLIENT'; payload: Client }
  | { type: 'UPDATE_CLIENT'; payload: Client }
  | { type: 'DELETE_CLIENT'; payload: string }
  | { type: 'SET_SELECTED_CLIENT'; payload: Client | null }
  | { type: 'SET_REVENUES'; payload: Revenue[] }
  | { type: 'ADD_REVENUE'; payload: Revenue }
  | { type: 'UPDATE_REVENUE'; payload: Revenue }
  | { type: 'DELETE_REVENUE'; payload: string }
  | { type: 'SET_SELECTED_REVENUE'; payload: Revenue | null };

const financeReducer = (state: FinanceState, action: FinanceAction): FinanceState => {
  switch (action.type) {
    case 'SET_CLIENTS':
      return { ...state, clients: action.payload };
    case 'ADD_CLIENT':
      return { ...state, clients: [action.payload, ...state.clients] };
    case 'UPDATE_CLIENT':
      return {
        ...state,
        clients: state.clients.map(client =>
          client.id === action.payload.id ? action.payload : client
        )
      };
    case 'DELETE_CLIENT':
      return {
        ...state,
        clients: state.clients.filter(client => client.id !== action.payload)
      };
    case 'SET_SELECTED_CLIENT':
      return { ...state, selectedClient: action.payload };
    // ... outros cases
    default:
      return state;
  }
};

const FinanceContext = createContext<{
  state: FinanceState;
  dispatch: React.Dispatch<FinanceAction>;
} | null>(null);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(financeReducer, {
    clients: [],
    entryModels: [],
    revenues: [],
    selectedClient: null,
    selectedRevenue: null,
  });

  return (
    <FinanceContext.Provider value={{ state, dispatch }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinanceContext = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinanceContext must be used within FinanceProvider');
  }
  return context;
};
```

---

## 🎨 CSS Classes Sugeridas

```css
/* Estilos base para componentes finance */
.clients-list {
  padding: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.clients-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.client-card {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.client-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: bold;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-group input.error {
  border-color: #ef4444;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.metric-card {
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
  text-align: center;
}

.metric-value {
  font-size: 2rem;
  font-weight: bold;
  margin: 0.5rem 0;
}

.metric-value.success { color: #10b981; }
.metric-value.warning { color: #fbbf24; }
.metric-value.error { color: #ef4444; }
```

---

**📅 Última atualização:** 08/08/2025  
**🔧 Versão:** TypeScript/React  
**📋 Status:** Pronto para implementação
