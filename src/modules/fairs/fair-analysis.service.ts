import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fair } from './entity/fair.entity';
import { StandConfiguration } from './entity/stand-configuration.entity';
import { FairAnalysisDto, StandConfigurationAnalysisDto, BusinessInsightDto } from './dto/fair-analysis.dto';

@Injectable()
export class FairAnalysisService {
  private readonly logger = new Logger(FairAnalysisService.name);

  constructor(
    @InjectRepository(Fair)
    private fairRepository: Repository<Fair>,
    @InjectRepository(StandConfiguration)
    private standConfigRepository: Repository<StandConfiguration>,
  ) {}

  async analyzeFair(fairId: string): Promise<any> {
    try {
      this.logger.log(`Iniciando análise da feira: ${fairId}`);
      
      const fair = await this.fairRepository.findOne({
        where: { id: fairId }
      });

      if (!fair) {
        this.logger.error(`Feira não encontrada: ${fairId}`);
        throw new Error('Feira não encontrada');
      }

      this.logger.log(`Feira encontrada: ${fair.name}`);

      // Retornar análise básica
      return {
        fairId: fair.id,
        totalStands: 0,
        totalArea: 0,
        totalRevenue: 0,
        totalCosts: 0,
        totalProfit: 0,
        profitMargin: 0,
        averagePricePerSquareMeter: 0,
        averageSetupCostPerSquareMeter: 0,
        standConfigurations: [],
        insights: [],
        recommendations: ['Configure stands para começar a análise']
      };
    } catch (error) {
      this.logger.error(`Erro na análise da feira ${fairId}:`, error);
      throw error;
    }
  }

  private calculateStandAnalysis(standConfigs: StandConfiguration[]): any {
    let totalStands = 0;
    let totalArea = 0;
    let totalRevenue = 0;
    let totalCosts = 0;
    let totalPricePerSquareMeter = 0;
    let totalSetupCostPerSquareMeter = 0;

    const standConfigurations: StandConfigurationAnalysisDto[] = standConfigs.map(config => {
      const area = config.width * config.height;
      const totalPrice = area * config.pricePerSquareMeter;
      const totalSetupCost = area * config.setupCostPerSquareMeter;
      const profitPerStand = totalPrice - totalSetupCost;
      const profitMargin = totalPrice > 0 ? (profitPerStand / totalPrice) * 100 : 0;
      const efficiency = area > 0 ? profitPerStand / area : 0;
      const totalConfigRevenue = totalPrice * config.quantity;
      const totalConfigCost = totalSetupCost * config.quantity;
      const totalConfigProfit = totalConfigRevenue - totalConfigCost;

      totalStands += config.quantity;
      totalArea += area * config.quantity;
      totalRevenue += totalConfigRevenue;
      totalCosts += totalConfigCost;
      totalPricePerSquareMeter += config.pricePerSquareMeter;
      totalSetupCostPerSquareMeter += config.setupCostPerSquareMeter;

      const recommendation = this.getStandRecommendation(profitMargin, efficiency);

      return {
        id: config.id,
        name: config.name,
        dimensions: `${config.width}x${config.height}`,
        area,
        quantity: config.quantity,
        pricePerSquareMeter: config.pricePerSquareMeter,
        setupCostPerSquareMeter: config.setupCostPerSquareMeter,
        totalPrice,
        totalSetupCost,
        profitPerStand,
        profitMargin,
        totalRevenue: totalConfigRevenue,
        totalCost: totalConfigCost,
        totalProfit: totalConfigProfit,
        efficiency,
        recommendation
      };
    });

    const totalProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const averagePricePerSquareMeter = standConfigs.length > 0 ? totalPricePerSquareMeter / standConfigs.length : 0;
    const averageSetupCostPerSquareMeter = standConfigs.length > 0 ? totalSetupCostPerSquareMeter / standConfigs.length : 0;

    return {
      totalStands,
      totalArea,
      totalRevenue,
      totalCosts,
      totalProfit,
      profitMargin,
      averagePricePerSquareMeter,
      averageSetupCostPerSquareMeter,
      standConfigurations
    };
  }

  private getStandRecommendation(profitMargin: number, efficiency: number): 'highly_recommended' | 'recommended' | 'moderate' | 'not_recommended' {
    if (profitMargin >= 60 && efficiency >= 100) return 'highly_recommended';
    if (profitMargin >= 40 && efficiency >= 75) return 'recommended';
    if (profitMargin >= 20 && efficiency >= 50) return 'moderate';
    return 'not_recommended';
  }

  private generateBusinessInsights(analysis: any): BusinessInsightDto[] {
    const insights: BusinessInsightDto[] = [];

    // Insight 1: Análise de margem de lucro
    if (analysis.profitMargin < 30) {
      insights.push({
        type: 'profit_optimization',
        title: 'Margem de Lucro Baixa',
        description: `A margem de lucro atual é de ${analysis.profitMargin.toFixed(2)}%, considerada baixa para o setor.`,
        impact: 'high',
        potentialIncrease: 25,
        action: 'Considere aumentar os preços por m² ou reduzir custos de montagem.'
      });
    } else if (analysis.profitMargin > 60) {
      insights.push({
        type: 'profit_optimization',
        title: 'Excelente Margem de Lucro',
        description: `Margem de lucro de ${analysis.profitMargin.toFixed(2)}% está excelente!`,
        impact: 'low',
        potentialIncrease: 0,
        action: 'Mantenha a estratégia atual ou considere expandir com mais stands.'
      });
    }

    // Insight 2: Análise de eficiência por stand
    const mostEfficient = analysis.standConfigurations.reduce((max, current) => 
      current.efficiency > max.efficiency ? current : max
    );
    const leastEfficient = analysis.standConfigurations.reduce((min, current) => 
      current.efficiency < min.efficiency ? current : min
    );

    if (mostEfficient.efficiency > leastEfficient.efficiency * 1.5) {
      insights.push({
        type: 'stand_efficiency',
        title: 'Oportunidade de Otimização',
        description: `O stand ${mostEfficient.name} é ${(mostEfficient.efficiency / leastEfficient.efficiency).toFixed(1)}x mais eficiente que o ${leastEfficient.name}.`,
        impact: 'medium',
        potentialIncrease: 15,
        action: `Considere focar mais na venda de stands ${mostEfficient.name} ou ajustar preços do ${leastEfficient.name}.`
      });
    }

    // Insight 3: Análise de preço por m²
    const avgPrice = analysis.averagePricePerSquareMeter;
    const avgCost = analysis.averageSetupCostPerSquareMeter;
    
    if (avgPrice < avgCost * 2) {
      insights.push({
        type: 'pricing_strategy',
        title: 'Preço por m² Pode Ser Aumentado',
        description: `O preço médio por m² (R$ ${avgPrice.toFixed(2)}) está muito próximo do custo de montagem (R$ ${avgCost.toFixed(2)}).`,
        impact: 'high',
        potentialIncrease: 30,
        action: 'Considere aumentar os preços por m² em 20-30% para melhorar a margem.'
      });
    }

    // Insight 4: Análise de ocupação
    const totalCapacity = analysis.totalStands;
    if (totalCapacity < 10) {
      insights.push({
        type: 'market_analysis',
        title: 'Capacidade Limitada',
        description: `A feira tem apenas ${totalCapacity} stands disponíveis.`,
        impact: 'medium',
        potentialIncrease: 0,
        action: 'Considere expandir a capacidade ou focar em stands de maior valor.'
      });
    }

    return insights;
  }

  private generateRecommendations(analysis: any): string[] {
    const recommendations: string[] = [];

    // Recomendação 1: Baseada na margem de lucro
    if (analysis.profitMargin < 30) {
      recommendations.push('Aumente os preços por m² em 15-25% para melhorar a margem de lucro');
      recommendations.push('Negocie melhores condições com fornecedores de montagem');
    }

    // Recomendação 2: Baseada na eficiência dos stands
    const efficientStands = analysis.standConfigurations.filter(s => s.recommendation === 'highly_recommended');
    if (efficientStands.length > 0) {
      recommendations.push(`Foque na venda de stands ${efficientStands.map(s => s.name).join(', ')} que têm melhor margem`);
    }

    // Recomendação 3: Baseada no preço médio
    if (analysis.averagePricePerSquareMeter < 100) {
      recommendations.push('Considere posicionar a feira como um evento premium com preços mais altos');
    }

    // Recomendação 4: Baseada na área total
    if (analysis.totalArea > 1000) {
      recommendations.push('Com uma área grande, considere oferecer pacotes corporativos com desconto');
    }

    return recommendations;
  }

  async optimizePricing(fairId: string, targetMargin: number = 50): Promise<any> {
    const analysis = await this.analyzeFair(fairId);
    
    const optimizedConfigs = analysis.standConfigurations.map(config => {
      const currentMargin = config.profitMargin;
      const targetPrice = config.totalSetupCost / (1 - targetMargin / 100);
      const newPricePerSquareMeter = targetPrice / config.area;
      const priceIncrease = ((newPricePerSquareMeter - config.pricePerSquareMeter) / config.pricePerSquareMeter) * 100;

      return {
        ...config,
        optimizedPricePerSquareMeter: newPricePerSquareMeter,
        priceIncrease: priceIncrease,
        newTotalPrice: targetPrice,
        newProfitMargin: targetMargin
      };
    });

    return {
      currentAnalysis: analysis,
      optimizedConfigurations: optimizedConfigs,
      targetMargin
    };
  }
}
