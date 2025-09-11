# 📋 Categorias Obrigatórias - Feature Documentation

## Visão Geral

Sistema aprimorado de categorias de despesas que permite marcar categorias como **obrigatórias** para a realização de uma feira. Isso facilita o controle de despesas essenciais e permite ao frontend exibir claramente quais categorias são necessárias para o evento acontecer.

## 🆕 Novos Campos

### **FinanceCategory Entity**

```typescript
{
  id: string;                    // UUID da categoria
  nome: string;                  // Nome da categoria
  parentId?: string;             // ID da categoria pai
  global: boolean;               // Se é global (padrão: true)
  fairId?: string;               // ID da feira (se específica)
  isRequired: boolean;           // NOVO: Se é obrigatória (padrão: false)
  description?: string;          // NOVO: Descrição da categoria
  parent?: FinanceCategory;      // Categoria pai
  children?: FinanceCategory[];  // Categorias filhas
}
```

## 🚀 Novos Endpoints

### **1. Listar Categorias Obrigatórias de uma Feira**
```http
GET /finance/categories/fair/:fairId/required
Authorization: Bearer <token>
```

**Resposta:**
```json
[
  {
    "id": "uuid-categoria-1",
    "nome": "Aluguel do Espaço",
    "parentId": null,
    "global": true,
    "fairId": null,
    "isRequired": true,
    "description": "Custo do aluguel do local da feira",
    "parent": null,
    "children": []
  },
  {
    "id": "uuid-categoria-2",
    "nome": "Segurança",
    "parentId": null,
    "global": true,
    "fairId": null,
    "isRequired": true,
    "description": "Contratação de segurança para o evento",
    "parent": null,
    "children": []
  }
]
```

### **2. Listar Categorias Opcionais de uma Feira**
```http
GET /finance/categories/fair/:fairId/optional
Authorization: Bearer <token>
```

**Resposta:**
```json
[
  {
    "id": "uuid-categoria-3",
    "nome": "Decoração",
    "parentId": null,
    "global": true,
    "fairId": null,
    "isRequired": false,
    "description": "Itens decorativos para o evento",
    "parent": null,
    "children": []
  }
]
```

### **3. Resumo das Categorias Obrigatórias**
```http
GET /finance/categories/fair/:fairId/required/summary
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "totalRequired": 5,
  "categories": [
    {
      "id": "uuid-categoria-1",
      "nome": "Aluguel do Espaço",
      "description": "Custo do aluguel do local da feira",
      "isGlobal": true,
      "parentId": null
    },
    {
      "id": "uuid-categoria-2",
      "nome": "Segurança",
      "description": "Contratação de segurança para o evento",
      "isGlobal": true,
      "parentId": null
    }
  ]
}
```

### **4. Alternar Status Obrigatório**
```http
PATCH /finance/categories/:id/toggle-required
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "id": "uuid-categoria-1",
  "nome": "Aluguel do Espaço",
  "parentId": null,
  "global": true,
  "fairId": null,
  "isRequired": false,
  "description": "Custo do aluguel do local da feira",
  "parent": null,
  "children": []
}
```

### **5. Criar Categoria com Status Obrigatório**
```http
POST /finance/categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "nome": "Limpeza",
  "parentId": null,
  "global": true,
  "fairId": "uuid-feira",
  "isRequired": true,
  "description": "Serviços de limpeza do local"
}
```

### **6. Atualizar Categoria**
```http
PATCH /finance/categories/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "isRequired": true,
  "description": "Nova descrição da categoria"
}
```

## 🎨 Implementação no Frontend

### **1. Componente de Lista de Categorias**

```jsx
// components/CategoriesList.jsx
import React, { useState, useEffect } from 'react';

const CategoriesList = ({ fairId }) => {
  const [categories, setCategories] = useState([]);
  const [requiredCategories, setRequiredCategories] = useState([]);
  const [optionalCategories, setOptionalCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [fairId]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const [all, required, optional] = await Promise.all([
        api.get(`/finance/categories/fair/${fairId}`),
        api.get(`/finance/categories/fair/${fairId}/required`),
        api.get(`/finance/categories/fair/${fairId}/optional`)
      ]);
      
      setCategories(all.data);
      setRequiredCategories(required.data);
      setOptionalCategories(optional.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRequired = async (categoryId) => {
    try {
      await api.patch(`/finance/categories/${categoryId}/toggle-required`);
      fetchCategories(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  return (
    <div className="categories-list">
      <div className="categories-section">
        <h3>Categorias Obrigatórias ({requiredCategories.length})</h3>
        <div className="categories-grid">
          {requiredCategories.map(category => (
            <CategoryCard
              key={category.id}
              category={category}
              isRequired={true}
              onToggleRequired={() => toggleRequired(category.id)}
            />
          ))}
        </div>
      </div>

      <div className="categories-section">
        <h3>Categorias Opcionais ({optionalCategories.length})</h3>
        <div className="categories-grid">
          {optionalCategories.map(category => (
            <CategoryCard
              key={category.id}
              category={category}
              isRequired={false}
              onToggleRequired={() => toggleRequired(category.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoriesList;
```

### **2. Componente de Card de Categoria**

```jsx
// components/CategoryCard.jsx
import React from 'react';

const CategoryCard = ({ category, isRequired, onToggleRequired }) => {
  return (
    <div className={`category-card ${isRequired ? 'required' : 'optional'}`}>
      <div className="category-header">
        <h4 className="category-name">{category.nome}</h4>
        <div className="category-actions">
          <button
            className={`btn btn-sm ${isRequired ? 'btn-warning' : 'btn-success'}`}
            onClick={onToggleRequired}
            title={isRequired ? 'Marcar como opcional' : 'Marcar como obrigatória'}
          >
            {isRequired ? '🔒' : '🔓'}
          </button>
        </div>
      </div>
      
      {category.description && (
        <p className="category-description">{category.description}</p>
      )}
      
      <div className="category-meta">
        <span className={`badge ${isRequired ? 'badge-danger' : 'badge-secondary'}`}>
          {isRequired ? 'Obrigatória' : 'Opcional'}
        </span>
        <span className={`badge ${category.global ? 'badge-primary' : 'badge-info'}`}>
          {category.global ? 'Global' : 'Específica'}
        </span>
      </div>
    </div>
  );
};

export default CategoryCard;
```

### **3. Hook Personalizado**

```javascript
// hooks/useCategories.js
import { useState, useEffect } from 'react';
import { api } from '../services/api';

export const useCategories = (fairId) => {
  const [categories, setCategories] = useState([]);
  const [requiredCategories, setRequiredCategories] = useState([]);
  const [optionalCategories, setOptionalCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = async () => {
    if (!fairId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [all, required, optional, summaryData] = await Promise.all([
        api.get(`/finance/categories/fair/${fairId}`),
        api.get(`/finance/categories/fair/${fairId}/required`),
        api.get(`/finance/categories/fair/${fairId}/optional`),
        api.get(`/finance/categories/fair/${fairId}/required/summary`)
      ]);
      
      setCategories(all.data);
      setRequiredCategories(required.data);
      setOptionalCategories(optional.data);
      setSummary(summaryData.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  const toggleRequired = async (categoryId) => {
    try {
      const response = await api.patch(`/finance/categories/${categoryId}/toggle-required`);
      
      // Atualizar estado local
      setCategories(prev => prev.map(cat => 
        cat.id === categoryId ? response.data : cat
      ));
      
      // Recarregar listas separadas
      await fetchAll();
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao alterar status');
      throw err;
    }
  };

  const createCategory = async (categoryData) => {
    try {
      const response = await api.post('/finance/categories', categoryData);
      await fetchAll(); // Recarregar todas as listas
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar categoria');
      throw err;
    }
  };

  const updateCategory = async (categoryId, updateData) => {
    try {
      const response = await api.patch(`/finance/categories/${categoryId}`, updateData);
      await fetchAll(); // Recarregar todas as listas
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao atualizar categoria');
      throw err;
    }
  };

  useEffect(() => {
    fetchAll();
  }, [fairId]);

  return {
    categories,
    requiredCategories,
    optionalCategories,
    summary,
    loading,
    error,
    fetchAll,
    toggleRequired,
    createCategory,
    updateCategory
  };
};
```

### **4. Página de Configuração de Categorias**

```jsx
// pages/CategoriesConfig.jsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import CategoriesList from '../components/CategoriesList';
import CategoryForm from '../components/CategoryForm';

const CategoriesConfig = () => {
  const { fairId } = useParams();
  const { 
    requiredCategories, 
    optionalCategories, 
    summary, 
    loading, 
    error,
    toggleRequired,
    createCategory 
  } = useCategories(fairId);
  
  const [showForm, setShowForm] = useState(false);

  if (loading) return <div className="loading">Carregando categorias...</div>;
  if (error) return <div className="error">Erro: {error}</div>;

  return (
    <div className="categories-config">
      <div className="page-header">
        <h1>Configuração de Categorias</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          + Nova Categoria
        </button>
      </div>

      {/* Resumo */}
      {summary && (
        <div className="summary-card">
          <h3>Resumo</h3>
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-label">Total Obrigatórias:</span>
              <span className="stat-value">{summary.totalRequired}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Total Opcionais:</span>
              <span className="stat-value">{optionalCategories.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Categorias */}
      <CategoriesList 
        fairId={fairId}
        requiredCategories={requiredCategories}
        optionalCategories={optionalCategories}
        onToggleRequired={toggleRequired}
      />

      {/* Modal de Formulário */}
      {showForm && (
        <CategoryForm
          fairId={fairId}
          onSave={createCategory}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
};

export default CategoriesConfig;
```

## 🎨 Estilos CSS

```css
/* styles/categories.css */
.categories-list {
  display: grid;
  gap: 30px;
  margin-top: 20px;
}

.categories-section h3 {
  color: #495057;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e9ecef;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.category-card {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  background: white;
  transition: all 0.2s ease;
}

.category-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.category-card.required {
  border-left: 4px solid #dc3545;
}

.category-card.optional {
  border-left: 4px solid #6c757d;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.category-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #212529;
}

.category-actions {
  display: flex;
  gap: 5px;
}

.category-description {
  color: #6c757d;
  font-size: 14px;
  margin-bottom: 15px;
  line-height: 1.5;
}

.category-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-danger {
  background: #f8d7da;
  color: #721c24;
}

.badge-secondary {
  background: #e2e3e5;
  color: #383d41;
}

.badge-primary {
  background: #cce7ff;
  color: #004085;
}

.badge-info {
  background: #d1ecf1;
  color: #0c5460;
}

.summary-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 15px;
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 6px;
}

.stat-label {
  font-weight: 500;
  color: #6c757d;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #212529;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #6c757d;
}

.error {
  text-align: center;
  padding: 40px;
  color: #dc3545;
  background: #f8d7da;
  border-radius: 8px;
  margin: 20px;
}
```

## 🔧 Validações e Regras de Negócio

### **1. Categorias Globais vs Específicas**
- **Globais**: Aplicam-se a todas as feiras
- **Específicas**: Aplicam-se apenas a uma feira específica
- Categorias globais obrigatórias são obrigatórias para todas as feiras

### **2. Hierarquia de Categorias**
- Categorias filhas herdam o status obrigatório da categoria pai
- Não é possível tornar uma categoria pai opcional se tiver filhos obrigatórios

### **3. Validações Frontend**
```javascript
const validateCategory = (categoryData) => {
  const errors = [];
  
  if (!categoryData.nome || categoryData.nome.trim().length < 2) {
    errors.push('Nome da categoria deve ter pelo menos 2 caracteres');
  }
  
  if (categoryData.parentId && categoryData.parentId === categoryData.id) {
    errors.push('Uma categoria não pode ser pai de si mesma');
  }
  
  return errors;
};
```

## 📊 Exemplos de Uso

### **1. Categorias Obrigatórias Típicas**
- Aluguel do Espaço
- Segurança
- Limpeza
- Energia Elétrica
- Licenças e Permissões
- Seguro do Evento

### **2. Categorias Opcionais Típicas**
- Decoração
- Marketing
- Brindes
- Coffee Break
- Fotografia
- Música/Entretenimento

### **3. Dashboard de Controle**
```javascript
// Exemplo de dashboard que mostra status das categorias obrigatórias
const RequiredCategoriesDashboard = ({ fairId }) => {
  const { requiredCategories, summary } = useCategories(fairId);
  
  return (
    <div className="dashboard">
      <h2>Categorias Obrigatórias</h2>
      <div className="status-grid">
        {requiredCategories.map(category => (
          <div key={category.id} className="status-card">
            <h4>{category.nome}</h4>
            <StatusIndicator 
              category={category}
              hasExpenses={checkIfHasExpenses(category.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## ✅ **Resumo da Implementação**

1. **✅ Campo `isRequired`** adicionado na entidade
2. **✅ DTOs atualizados** com novos campos
3. **✅ Endpoints criados** para gerenciar categorias obrigatórias
4. **✅ Documentação Swagger** completa
5. **✅ Exemplos de frontend** prontos para implementação

**Próximos passos:**
1. Testar os endpoints no Postman/Insomnia
2. Implementar os componentes no frontend
3. Adicionar validações de negócio específicas
4. Criar relatórios de conformidade de categorias obrigatórias
