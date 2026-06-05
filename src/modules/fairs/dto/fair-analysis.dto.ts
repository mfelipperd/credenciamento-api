export class FairAnalysisDto {
  fairId: string;
  totalStands: number;
  totalArea: number;
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  profitMargin: number;
  averagePricePerSquareMeter: number;
  averageSetupCostPerSquareMeter: number;
  standConfigurations: StandConfigurationAnalysisDto[];
  insights: BusinessInsightDto[];
  recommendations: string[];
}

export class StandConfigurationAnalysisDto {
  id: string;
  name: string;
  dimensions: string; // "2x3", "3x3", etc.
  area: number;
  quantity: number;
  pricePerSquareMeter: number;
  setupCostPerSquareMeter: number;
  totalPrice: number;
  totalSetupCost: number;
  profitPerStand: number;
  profitMargin: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  efficiency: number; // Lucro por m²
  recommendation:
    | 'highly_recommended'
    | 'recommended'
    | 'moderate'
    | 'not_recommended';
}

export class BusinessInsightDto {
  type:
    | 'profit_optimization'
    | 'pricing_strategy'
    | 'stand_efficiency'
    | 'market_analysis';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  potentialIncrease: number; // Aumento potencial em %
  action: string;
}
