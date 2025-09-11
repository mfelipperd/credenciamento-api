# 💻 Exemplos Práticos de Integração - Módulo de Feiras

## 🚀 Exemplo Completo: Dashboard de Análise de Feira

### **1. Página Principal de Análise**

```jsx
// pages/FairAnalysis.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  FairAnalysisDashboard, 
  StandConfigurationList, 
  InsightsPanel,
  OptimizationPanel 
} from '../components';
import { useFairAnalysis, useStandConfigurations } from '../hooks';

const FairAnalysisPage = () => {
  const { fairId } = useParams();
  const { analysis, loading, error, fetchAnalysis, optimizePricing } = useFairAnalysis(fairId);
  const { configurations, statistics, createConfiguration, updateConfiguration } = useStandConfigurations(fairId);
  
  const [showOptimization, setShowOptimization] = useState(false);
  const [targetMargin, setTargetMargin] = useState(50);

  useEffect(() => {
    fetchAnalysis();
  }, [fairId]);

  const handleOptimize = async () => {
    try {
      const optimized = await optimizePricing(targetMargin);
      // Mostrar modal com preços otimizados
      setShowOptimization(true);
    } catch (error) {
      console.error('Erro na otimização:', error);
    }
  };

  if (loading) return <div className="loading">Carregando análise...</div>;
  if (error) return <div className="error">Erro: {error}</div>;

  return (
    <div className="fair-analysis-page">
      <div className="page-header">
        <h1>Análise de Feira</h1>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={handleOptimize}
          >
            Otimizar Preços
          </button>
        </div>
      </div>

      <div className="analysis-grid">
        {/* Métricas Principais */}
        <div className="metrics-section">
          <h2>Métricas Principais</h2>
          <div className="metrics-grid">
            <MetricCard
              title="Receita Total"
              value={`R$ ${analysis.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              subtitle={`${analysis.totalStands} stands`}
              color="success"
            />
            <MetricCard
              title="Lucro Total"
              value={`R$ ${analysis.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              subtitle={`${analysis.profitMargin.toFixed(2)}% de margem`}
              color="primary"
            />
            <MetricCard
              title="Área Total"
              value={`${analysis.totalArea}m²`}
              subtitle={`${analysis.averagePricePerSquareMeter.toFixed(2)} R$/m²`}
              color="info"
            />
            <MetricCard
              title="Custos Totais"
              value={`R$ ${analysis.totalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              subtitle={`${analysis.averageSetupCostPerSquareMeter.toFixed(2)} R$/m²`}
              color="warning"
            />
          </div>
        </div>

        {/* Configurações de Stands */}
        <div className="configurations-section">
          <h2>Configurações de Stands</h2>
          <StandConfigurationList
            configurations={configurations}
            onEdit={updateConfiguration}
            onToggle={(id) => {/* implementar toggle */}}
            onDelete={(id) => {/* implementar delete */}}
          />
        </div>

        {/* Insights e Recomendações */}
        <div className="insights-section">
          <h2>Insights de Negócio</h2>
          <InsightsPanel insights={analysis.insights} recommendations={analysis.recommendations} />
        </div>

        {/* Gráficos */}
        <div className="charts-section">
          <h2>Análise Visual</h2>
          <div className="charts-grid">
            <div className="chart-container">
              <ProfitMarginChart analysis={analysis} />
            </div>
            <div className="chart-container">
              <StandEfficiencyChart configurations={analysis.standConfigurations} />
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Otimização */}
      {showOptimization && (
        <OptimizationModal
          onClose={() => setShowOptimization(false)}
          targetMargin={targetMargin}
          onTargetMarginChange={setTargetMargin}
          onOptimize={handleOptimize}
        />
      )}
    </div>
  );
};

export default FairAnalysisPage;
```

### **2. Hook Personalizado para Análise**

```javascript
// hooks/useFairAnalysis.js
import { useState, useCallback } from 'react';
import { api } from '../services/api';

export const useFairAnalysis = (fairId) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalysis = useCallback(async () => {
    if (!fairId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/fair-analysis/fair/${fairId}`);
      setAnalysis(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar análise');
    } finally {
      setLoading(false);
    }
  }, [fairId]);

  const optimizePricing = useCallback(async (targetMargin) => {
    try {
      const response = await api.post(
        `/fair-analysis/fair/${fairId}/optimize-pricing?targetMargin=${targetMargin}`
      );
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Erro na otimização');
    }
  }, [fairId]);

  const getInsights = useCallback(async () => {
    try {
      const response = await api.get(`/fair-analysis/fair/${fairId}/insights`);
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Erro ao carregar insights');
    }
  }, [fairId]);

  const getStandEfficiency = useCallback(async () => {
    try {
      const response = await api.get(`/fair-analysis/fair/${fairId}/stand-efficiency`);
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Erro ao carregar eficiência');
    }
  }, [fairId]);

  return {
    analysis,
    loading,
    error,
    fetchAnalysis,
    optimizePricing,
    getInsights,
    getStandEfficiency
  };
};
```

### **3. Componente de Lista de Configurações**

```jsx
// components/StandConfigurationList.jsx
import React, { useState } from 'react';
import { StandConfigurationCard } from './StandConfigurationCard';
import { StandConfigurationForm } from './StandConfigurationForm';

const StandConfigurationList = ({ 
  configurations, 
  onEdit, 
  onToggle, 
  onDelete,
  onCreate 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);

  const handleEdit = (config) => {
    setEditingConfig(config);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingConfig(null);
    setShowForm(true);
  };

  const handleSave = async (formData) => {
    try {
      if (editingConfig) {
        await onEdit(editingConfig.id, formData);
      } else {
        await onCreate(formData);
      }
      setShowForm(false);
      setEditingConfig(null);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingConfig(null);
  };

  return (
    <div className="stand-configuration-list">
      <div className="list-header">
        <h3>Configurações de Stands</h3>
        <button 
          className="btn btn-primary btn-sm"
          onClick={handleCreate}
        >
          + Nova Configuração
        </button>
      </div>

      {showForm && (
        <div className="form-modal">
          <div className="form-modal-content">
            <StandConfigurationForm
              fairId={configurations[0]?.fairId}
              onSave={handleSave}
              onCancel={handleCancel}
              initialData={editingConfig}
            />
          </div>
        </div>
      )}

      <div className="configurations-grid">
        {configurations.map(config => (
          <StandConfigurationCard
            key={config.id}
            config={config}
            onEdit={() => handleEdit(config)}
            onToggle={() => onToggle(config.id)}
            onDelete={() => onDelete(config.id)}
          />
        ))}
      </div>

      {configurations.length === 0 && (
        <div className="empty-state">
          <p>Nenhuma configuração de stand encontrada.</p>
          <button 
            className="btn btn-primary"
            onClick={handleCreate}
          >
            Criar Primeira Configuração
          </button>
        </div>
      )}
    </div>
  );
};

export default StandConfigurationList;
```

### **4. Componente de Card de Configuração**

```jsx
// components/StandConfigurationCard.jsx
import React from 'react';

const StandConfigurationCard = ({ config, onEdit, onToggle, onDelete }) => {
  const getRecommendationColor = (recommendation) => {
    switch (recommendation) {
      case 'highly_recommended': return 'success';
      case 'recommended': return 'primary';
      case 'moderate': return 'warning';
      case 'not_recommended': return 'danger';
      default: return 'secondary';
    }
  };

  const getRecommendationText = (recommendation) => {
    switch (recommendation) {
      case 'highly_recommended': return 'Altamente Recomendado';
      case 'recommended': return 'Recomendado';
      case 'moderate': return 'Moderado';
      case 'not_recommended': return 'Não Recomendado';
      default: return 'Indefinido';
    }
  };

  return (
    <div className={`stand-config-card ${!config.isActive ? 'inactive' : ''}`}>
      <div className="card-header">
        <h4 className="card-title">{config.name}</h4>
        <div className="card-actions">
          <button 
            className="btn btn-sm btn-outline-primary"
            onClick={() => onEdit()}
            title="Editar"
          >
            ✏️
          </button>
          <button 
            className={`btn btn-sm ${config.isActive ? 'btn-warning' : 'btn-success'}`}
            onClick={() => onToggle()}
            title={config.isActive ? 'Desativar' : 'Ativar'}
          >
            {config.isActive ? '⏸️' : '▶️'}
          </button>
          <button 
            className="btn btn-sm btn-outline-danger"
            onClick={() => onDelete()}
            title="Excluir"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="card-body">
        <div className="config-details">
          <div className="detail-row">
            <span className="label">Dimensões:</span>
            <span className="value">{config.width}m × {config.height}m</span>
          </div>
          <div className="detail-row">
            <span className="label">Área:</span>
            <span className="value">{config.width * config.height}m²</span>
          </div>
          <div className="detail-row">
            <span className="label">Quantidade:</span>
            <span className="value">{config.quantity} unidades</span>
          </div>
        </div>

        <div className="pricing-details">
          <div className="detail-row">
            <span className="label">Preço/m²:</span>
            <span className="value">R$ {config.pricePerSquareMeter.toFixed(2)}</span>
          </div>
          <div className="detail-row">
            <span className="label">Custo Montagem/m²:</span>
            <span className="value">R$ {config.setupCostPerSquareMeter.toFixed(2)}</span>
          </div>
        </div>

        <div className="metrics-details">
          <div className="metric">
            <span className="metric-label">Preço Total:</span>
            <span className="metric-value">R$ {config.totalPrice.toFixed(2)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Custo Total:</span>
            <span className="metric-value">R$ {config.totalSetupCost.toFixed(2)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Lucro/Stand:</span>
            <span className="metric-value">R$ {config.profitPerStand.toFixed(2)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Margem:</span>
            <span className="metric-value">{config.profitMargin.toFixed(2)}%</span>
          </div>
        </div>

        <div className="recommendation">
          <span className={`badge badge-${getRecommendationColor('recommended')}`}>
            {getRecommendationText('recommended')}
          </span>
        </div>

        {config.description && (
          <div className="description">
            <p>{config.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StandConfigurationCard;
```

### **5. Componente de Insights**

```jsx
// components/InsightsPanel.jsx
import React from 'react';
import { InsightCard } from './InsightCard';

const InsightsPanel = ({ insights, recommendations }) => {
  const getInsightIcon = (type) => {
    switch (type) {
      case 'profit_optimization': return '💰';
      case 'stand_efficiency': return '📊';
      case 'pricing_strategy': return '💲';
      case 'market_analysis': return '📈';
      default: return '💡';
    }
  };

  return (
    <div className="insights-panel">
      <div className="insights-section">
        <h3>Insights Inteligentes</h3>
        <div className="insights-grid">
          {insights.map((insight, index) => (
            <InsightCard
              key={index}
              insight={insight}
              icon={getInsightIcon(insight.type)}
              onAction={(action) => {
                console.log('Ação sugerida:', action);
                // Implementar lógica de ação
              }}
            />
          ))}
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="recommendations-section">
          <h3>Recomendações</h3>
          <ul className="recommendations-list">
            {recommendations.map((recommendation, index) => (
              <li key={index} className="recommendation-item">
                <span className="recommendation-icon">💡</span>
                <span className="recommendation-text">{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default InsightsPanel;
```

### **6. Componente de Card de Insight**

```jsx
// components/InsightCard.jsx
import React from 'react';

const InsightCard = ({ insight, icon, onAction }) => {
  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'secondary';
    }
  };

  const getImpactText = (impact) => {
    switch (impact) {
      case 'high': return 'Alto Impacto';
      case 'medium': return 'Médio Impacto';
      case 'low': return 'Baixo Impacto';
      default: return 'Impacto Indefinido';
    }
  };

  return (
    <div className={`insight-card insight-card--${getImpactColor(insight.impact)}`}>
      <div className="insight-header">
        <div className="insight-icon">{icon}</div>
        <div className="insight-title-section">
          <h4 className="insight-title">{insight.title}</h4>
          <span className="insight-type">{insight.type.replace('_', ' ')}</span>
        </div>
        <div className="insight-impact">
          <span className={`badge badge-${getImpactColor(insight.impact)}`}>
            {getImpactText(insight.impact)}
          </span>
        </div>
      </div>

      <div className="insight-body">
        <p className="insight-description">{insight.description}</p>
        
        {insight.potentialIncrease > 0 && (
          <div className="insight-potential">
            <span className="potential-label">Aumento Potencial:</span>
            <span className="potential-value">+{insight.potentialIncrease}%</span>
          </div>
        )}
      </div>

      <div className="insight-footer">
        <button 
          className="btn btn-sm btn-outline-primary"
          onClick={() => onAction(insight.action)}
        >
          {insight.action}
        </button>
      </div>
    </div>
  );
};

export default InsightCard;
```

### **7. Serviço de API**

```javascript
// services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  timeout: 10000,
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { api };
```

### **8. Estilos CSS**

```css
/* styles/fair-analysis.css */
.fair-analysis-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e9ecef;
}

.analysis-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
}

.metrics-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.metric-card {
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid;
  background: #f8f9fa;
}

.metric-card--success { border-left-color: #28a745; }
.metric-card--primary { border-left-color: #007bff; }
.metric-card--info { border-left-color: #17a2b8; }
.metric-card--warning { border-left-color: #ffc107; }

.metric-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.metric-card__title {
  font-size: 14px;
  font-weight: 600;
  color: #6c757d;
  margin: 0;
}

.metric-card__trend {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.metric-card__trend--positive {
  background: #d4edda;
  color: #155724;
}

.metric-card__trend--negative {
  background: #f8d7da;
  color: #721c24;
}

.metric-card__value {
  font-size: 24px;
  font-weight: 700;
  color: #212529;
  margin-bottom: 5px;
}

.metric-card__subtitle {
  font-size: 12px;
  color: #6c757d;
}

.stand-configuration-list {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.configurations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.stand-config-card {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  background: white;
  transition: all 0.2s ease;
}

.stand-config-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.stand-config-card.inactive {
  opacity: 0.6;
  background: #f8f9fa;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.card-actions {
  display: flex;
  gap: 5px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.label {
  font-weight: 500;
  color: #6c757d;
}

.value {
  font-weight: 600;
  color: #212529;
}

.metrics-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 15px 0;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.metric-label {
  font-size: 12px;
  color: #6c757d;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
  color: #212529;
}

.recommendation {
  margin-top: 15px;
  text-align: center;
}

.insights-panel {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.insight-card {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  background: white;
}

.insight-card--danger {
  border-left: 4px solid #dc3545;
}

.insight-card--warning {
  border-left: 4px solid #ffc107;
}

.insight-card--info {
  border-left: 4px solid #17a2b8;
}

.insight-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.insight-icon {
  font-size: 24px;
  margin-right: 15px;
}

.insight-title-section {
  flex: 1;
}

.insight-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 5px 0;
}

.insight-type {
  font-size: 12px;
  color: #6c757d;
  text-transform: capitalize;
}

.insight-impact {
  margin-left: 15px;
}

.insight-description {
  color: #6c757d;
  margin-bottom: 15px;
  line-height: 1.5;
}

.insight-potential {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #e8f5e8;
  border-radius: 4px;
  margin-bottom: 15px;
}

.potential-label {
  font-size: 12px;
  color: #155724;
}

.potential-value {
  font-size: 14px;
  font-weight: 600;
  color: #155724;
}

.insight-footer {
  text-align: right;
}

.recommendations-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
}

.recommendations-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.recommendation-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f8f9fa;
}

.recommendation-icon {
  margin-right: 10px;
  font-size: 16px;
}

.recommendation-text {
  color: #6c757d;
  line-height: 1.5;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6c757d;
}

.form-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.form-modal-content {
  background: white;
  border-radius: 8px;
  padding: 30px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
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

### **9. Exemplo de Uso com Redux**

```javascript
// store/slices/fairAnalysisSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../services/api';

export const fetchFairAnalysis = createAsyncThunk(
  'fairAnalysis/fetchAnalysis',
  async (fairId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/fair-analysis/fair/${fairId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erro ao carregar análise');
    }
  }
);

export const optimizePricing = createAsyncThunk(
  'fairAnalysis/optimizePricing',
  async ({ fairId, targetMargin }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/fair-analysis/fair/${fairId}/optimize-pricing?targetMargin=${targetMargin}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erro na otimização');
    }
  }
);

const fairAnalysisSlice = createSlice({
  name: 'fairAnalysis',
  initialState: {
    analysis: null,
    loading: false,
    error: null,
    optimization: null
  },
  reducers: {
    clearAnalysis: (state) => {
      state.analysis = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFairAnalysis.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFairAnalysis.fulfilled, (state, action) => {
        state.loading = false;
        state.analysis = action.payload;
      })
      .addCase(fetchFairAnalysis.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(optimizePricing.fulfilled, (state, action) => {
        state.optimization = action.payload;
      });
  }
});

export const { clearAnalysis } = fairAnalysisSlice.actions;
export default fairAnalysisSlice.reducer;
```

---

## 🎯 **Resumo dos Exemplos**

Estes exemplos fornecem:

1. **Estrutura completa** de páginas e componentes
2. **Hooks personalizados** para gerenciamento de estado
3. **Tratamento de erros** robusto
4. **Validações** frontend e backend
5. **Estilos CSS** responsivos
6. **Integração com Redux** (opcional)
7. **Componentes reutilizáveis** e modulares

**Próximos passos:**
1. Adaptar os componentes para sua biblioteca de UI (Material-UI, Ant Design, etc.)
2. Implementar testes unitários
3. Adicionar animações e transições
4. Configurar PWA para uso offline
5. Implementar cache inteligente para melhor performance
