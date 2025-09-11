# 🎨 Guia de Integração Frontend - Módulo de Feiras

## 📋 Checklist de Implementação

### ✅ **1. Páginas Necessárias**

#### **Dashboard de Feiras**
- Lista de feiras com status ativo/inativo
- Cards com métricas principais (receita, lucro, margem)
- Ações rápidas (análise, configuração, otimização)

#### **Configuração de Stands**
- Formulário para criar/editar configurações
- Lista de configurações com métricas calculadas
- Toggle para ativar/desativar configurações
- Validação de dimensões e preços

#### **Análise de Margem**
- Dashboard com gráficos de receita vs custos
- Tabela de eficiência por tipo de stand
- Seção de insights e recomendações
- Simulador de otimização de preços

### ✅ **2. Componentes React/Vue/Angular**

#### **StandConfigurationCard**
```typescript
interface StandConfigurationCardProps {
  config: StandConfiguration;
  onEdit: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}
```

#### **FairAnalysisDashboard**
```typescript
interface FairAnalysisDashboardProps {
  fairId: string;
  analysis: FairAnalysis;
  onOptimize: (targetMargin: number) => void;
}
```

#### **InsightCard**
```typescript
interface InsightCardProps {
  insight: BusinessInsight;
  onAction: (action: string) => void;
}
```

### ✅ **3. Estados e Hooks**

#### **useFairAnalysis**
```typescript
const useFairAnalysis = (fairId: string) => {
  const [analysis, setAnalysis] = useState<FairAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/fair-analysis/fair/${fairId}`);
      setAnalysis(response.data);
    } catch (err) {
      setError('Erro ao carregar análise');
    } finally {
      setLoading(false);
    }
  };

  const optimizePricing = async (targetMargin: number) => {
    const response = await api.post(`/fair-analysis/fair/${fairId}/optimize-pricing?targetMargin=${targetMargin}`);
    return response.data;
  };

  return { analysis, loading, error, fetchAnalysis, optimizePricing };
};
```

#### **useStandConfigurations**
```typescript
const useStandConfigurations = (fairId: string) => {
  const [configurations, setConfigurations] = useState<StandConfiguration[]>([]);
  const [statistics, setStatistics] = useState<StandStatistics | null>(null);

  const createConfiguration = async (data: CreateStandConfigurationDto) => {
    const response = await api.post(`/stand-configurations/fair/${fairId}`, data);
    setConfigurations(prev => [...prev, response.data]);
    return response.data;
  };

  const updateConfiguration = async (id: string, data: UpdateStandConfigurationDto) => {
    const response = await api.patch(`/stand-configurations/${id}`, data);
    setConfigurations(prev => prev.map(config => 
      config.id === id ? response.data : config
    ));
    return response.data;
  };

  const toggleActive = async (id: string) => {
    const response = await api.patch(`/stand-configurations/${id}/toggle-active`);
    setConfigurations(prev => prev.map(config => 
      config.id === id ? response.data : config
    ));
    return response.data;
  };

  return {
    configurations,
    statistics,
    createConfiguration,
    updateConfiguration,
    toggleActive
  };
};
```

### ✅ **4. Validações Frontend**

#### **Validação de Dimensões**
```typescript
const validateDimensions = (width: number, height: number) => {
  const errors: string[] = [];
  
  if (width < 1 || width > 20) {
    errors.push('Largura deve estar entre 1 e 20 metros');
  }
  
  if (height < 1 || height > 20) {
    errors.push('Altura deve estar entre 1 e 20 metros');
  }
  
  if (width * height > 100) {
    errors.push('Área total não pode exceder 100m²');
  }
  
  return errors;
};
```

#### **Validação de Preços**
```typescript
const validatePricing = (pricePerM2: number, setupCostPerM2: number) => {
  const errors: string[] = [];
  
  if (pricePerM2 < 0) {
    errors.push('Preço por m² não pode ser negativo');
  }
  
  if (setupCostPerM2 < 0) {
    errors.push('Custo de montagem por m² não pode ser negativo');
  }
  
  if (pricePerM2 <= setupCostPerM2) {
    errors.push('Preço por m² deve ser maior que custo de montagem');
  }
  
  return errors;
};
```

### ✅ **5. Cálculos Frontend**

#### **Cálculo de Métricas**
```typescript
const calculateStandMetrics = (config: StandConfiguration) => {
  const area = config.width * config.height;
  const totalPrice = area * config.pricePerSquareMeter;
  const totalSetupCost = area * config.setupCostPerSquareMeter;
  const profitPerStand = totalPrice - totalSetupCost;
  const profitMargin = totalPrice > 0 ? (profitPerStand / totalPrice) * 100 : 0;
  const efficiency = area > 0 ? profitPerStand / area : 0;
  
  return {
    area,
    totalPrice,
    totalSetupCost,
    profitPerStand,
    profitMargin,
    efficiency
  };
};
```

#### **Cálculo de Análise Geral**
```typescript
const calculateFairAnalysis = (configurations: StandConfiguration[]) => {
  const totalStands = configurations.reduce((sum, config) => sum + config.quantity, 0);
  const totalArea = configurations.reduce((sum, config) => 
    sum + (config.width * config.height * config.quantity), 0
  );
  const totalRevenue = configurations.reduce((sum, config) => 
    sum + (config.totalPrice * config.quantity), 0
  );
  const totalCosts = configurations.reduce((sum, config) => 
    sum + (config.totalSetupCost * config.quantity), 0
  );
  const totalProfit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  
  return {
    totalStands,
    totalArea,
    totalRevenue,
    totalCosts,
    totalProfit,
    profitMargin
  };
};
```

### ✅ **6. Componentes de UI**

#### **MétricaCard**
```jsx
const MetricCard = ({ title, value, subtitle, trend, color = 'primary' }) => (
  <div className={`metric-card metric-card--${color}`}>
    <div className="metric-card__header">
      <h3 className="metric-card__title">{title}</h3>
      {trend && (
        <span className={`metric-card__trend metric-card__trend--${trend.type}`}>
          {trend.value > 0 ? '+' : ''}{trend.value}%
        </span>
      )}
    </div>
    <div className="metric-card__value">{value}</div>
    {subtitle && <div className="metric-card__subtitle">{subtitle}</div>}
  </div>
);
```

#### **InsightAlert**
```jsx
const InsightAlert = ({ insight, onAction }) => {
  const getAlertType = (impact) => {
    switch (impact) {
      case 'high': return 'alert-danger';
      case 'medium': return 'alert-warning';
      case 'low': return 'alert-info';
      default: return 'alert-secondary';
    }
  };

  return (
    <div className={`alert ${getAlertType(insight.impact)} insight-alert`}>
      <div className="insight-alert__header">
        <h4 className="insight-alert__title">{insight.title}</h4>
        <span className="insight-alert__type">{insight.type}</span>
      </div>
      <p className="insight-alert__description">{insight.description}</p>
      <div className="insight-alert__action">
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
```

#### **StandConfigurationForm**
```jsx
const StandConfigurationForm = ({ fairId, onSave, onCancel, initialData }) => {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    width: 2,
    height: 3,
    quantity: 1,
    pricePerSquareMeter: 0,
    setupCostPerSquareMeter: 0,
    description: '',
    isActive: true
  });

  const [errors, setErrors] = useState({});
  const [calculatedMetrics, setCalculatedMetrics] = useState({});

  useEffect(() => {
    const metrics = calculateStandMetrics(formData);
    setCalculatedMetrics(metrics);
  }, [formData.width, formData.height, formData.pricePerSquareMeter, formData.setupCostPerSquareMeter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const dimensionErrors = validateDimensions(formData.width, formData.height);
    const pricingErrors = validatePricing(formData.pricePerSquareMeter, formData.setupCostPerSquareMeter);
    
    if (dimensionErrors.length > 0 || pricingErrors.length > 0) {
      setErrors({ dimensions: dimensionErrors, pricing: pricingErrors });
      return;
    }

    try {
      await onSave(formData);
    } catch (error) {
      setErrors({ general: error.message });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stand-config-form">
      <div className="form-row">
        <div className="form-group">
          <label>Nome da Configuração</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="form-control"
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Largura (metros)</label>
          <input
            type="number"
            min="1"
            max="20"
            value={formData.width}
            onChange={(e) => setFormData({...formData, width: Number(e.target.value)})}
            className="form-control"
            required
          />
        </div>
        <div className="form-group">
          <label>Altura (metros)</label>
          <input
            type="number"
            min="1"
            max="20"
            value={formData.height}
            onChange={(e) => setFormData({...formData, height: Number(e.target.value)})}
            className="form-control"
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Quantidade</label>
          <input
            type="number"
            min="0"
            value={formData.quantity}
            onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})}
            className="form-control"
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Preço por m² (R$)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.pricePerSquareMeter}
            onChange={(e) => setFormData({...formData, pricePerSquareMeter: Number(e.target.value)})}
            className="form-control"
            required
          />
        </div>
        <div className="form-group">
          <label>Custo de Montagem por m² (R$)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.setupCostPerSquareMeter}
            onChange={(e) => setFormData({...formData, setupCostPerSquareMeter: Number(e.target.value)})}
            className="form-control"
            required
          />
        </div>
      </div>

      {/* Exibição de métricas calculadas */}
      <div className="calculated-metrics">
        <h4>Métricas Calculadas</h4>
        <div className="metrics-grid">
          <div className="metric">
            <span className="metric-label">Área:</span>
            <span className="metric-value">{calculatedMetrics.area}m²</span>
          </div>
          <div className="metric">
            <span className="metric-label">Preço Total:</span>
            <span className="metric-value">R$ {calculatedMetrics.totalPrice?.toFixed(2)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Custo Total:</span>
            <span className="metric-value">R$ {calculatedMetrics.totalSetupCost?.toFixed(2)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Lucro por Stand:</span>
            <span className="metric-value">R$ {calculatedMetrics.profitPerStand?.toFixed(2)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Margem de Lucro:</span>
            <span className="metric-value">{calculatedMetrics.profitMargin?.toFixed(2)}%</span>
          </div>
          <div className="metric">
            <span className="metric-label">Eficiência:</span>
            <span className="metric-value">R$ {calculatedMetrics.efficiency?.toFixed(2)}/m²</span>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          Salvar Configuração
        </button>
      </div>
    </form>
  );
};
```

### ✅ **7. Gráficos e Visualizações**

#### **Gráfico de Margem de Lucro**
```javascript
// Usando Chart.js ou similar
const createProfitMarginChart = (analysis) => {
  const ctx = document.getElementById('profitMarginChart').getContext('2d');
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Lucro', 'Custos'],
      datasets: [{
        data: [analysis.totalProfit, analysis.totalCosts],
        backgroundColor: ['#28a745', '#dc3545'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        },
        title: {
          display: true,
          text: `Margem de Lucro: ${analysis.profitMargin.toFixed(2)}%`
        }
      }
    }
  });
};
```

#### **Gráfico de Eficiência por Stand**
```javascript
const createEfficiencyChart = (standConfigurations) => {
  const ctx = document.getElementById('efficiencyChart').getContext('2d');
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: standConfigurations.map(config => config.name),
      datasets: [{
        label: 'Eficiência (R$/m²)',
        data: standConfigurations.map(config => config.efficiency),
        backgroundColor: standConfigurations.map(config => 
          config.recommendation === 'highly_recommended' ? '#28a745' :
          config.recommendation === 'recommended' ? '#ffc107' :
          config.recommendation === 'moderate' ? '#fd7e14' : '#dc3545'
        )
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Eficiência (R$/m²)'
          }
        }
      }
    }
  });
};
```

### ✅ **8. Tratamento de Erros**

#### **ErrorBoundary para Análise**
```jsx
class AnalysisErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Erro na análise de feira:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h3>Erro ao carregar análise</h3>
          <p>Ocorreu um erro inesperado. Tente recarregar a página.</p>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### ✅ **9. Testes**

#### **Teste de Hook useFairAnalysis**
```javascript
import { renderHook, act } from '@testing-library/react-hooks';
import { useFairAnalysis } from './hooks/useFairAnalysis';

describe('useFairAnalysis', () => {
  it('should fetch analysis data', async () => {
    const { result } = renderHook(() => useFairAnalysis('test-fair-id'));
    
    await act(async () => {
      await result.current.fetchAnalysis();
    });
    
    expect(result.current.analysis).toBeDefined();
    expect(result.current.loading).toBe(false);
  });
});
```

### ✅ **10. Performance**

#### **Memoização de Componentes**
```jsx
const StandConfigurationCard = React.memo(({ config, onEdit, onToggle, onDelete }) => {
  const metrics = useMemo(() => calculateStandMetrics(config), [config]);
  
  return (
    <div className="stand-config-card">
      {/* Renderização do card */}
    </div>
  );
});
```

#### **Lazy Loading de Análise**
```jsx
const FairAnalysisDashboard = lazy(() => import('./FairAnalysisDashboard'));

// No componente pai
<Suspense fallback={<div>Carregando análise...</div>}>
  <FairAnalysisDashboard fairId={fairId} />
</Suspense>
```

---

## 🎯 **Resumo de Implementação**

1. **Criar 3 páginas principais**: Dashboard, Configuração de Stands, Análise
2. **Implementar 5+ componentes reutilizáveis**
3. **Criar 2+ hooks customizados** para gerenciar estado
4. **Adicionar validações** frontend e backend
5. **Implementar gráficos** para visualização de dados
6. **Configurar tratamento de erros** robusto
7. **Adicionar testes** unitários e de integração
8. **Otimizar performance** com memoização e lazy loading

**Tempo estimado de desenvolvimento**: 2-3 semanas
**Complexidade**: Média-Alta
**Prioridade**: Alta (funcionalidade core do negócio)
