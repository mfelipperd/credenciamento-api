import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Revenue } from './entities/revenue.entity';
import { RevenueInstallment } from './entities/revenue-installment.entity';
import {
  RevenueStatus,
  InstallmentStatus,
} from '../common/enums/finance.enums';

// Revenue Charts Service

// Interfaces para tipagem dos resultados das queries
interface RevenuesByPeriodRawResult {
  period: string;
  count: string;
  totalValue: string;
  paidValue: string;
  pendingValue: string;
  overdueValue: string;
}

interface RevenuesByStatusRawResult {
  revenue_status: string;
  count: string;
  totalValue: string;
}

interface RevenuesByPaymentMethodRawResult {
  revenue_paymentMethod: string;
  count: string;
  totalValue: string;
}

interface RevenueStatsRawResult {
  totalRevenues: string;
  totalValue: string;
  averageValue: string;
  paidRevenues: string;
  pendingRevenues: string;
  overdueRevenues: string;
}

interface InstallmentStatsRawResult {
  totalInstallments: string;
  paidInstallments: string;
  overdueInstallments: string;
  averageInstallments: string;
}

interface TopClientsRawResult {
  clientId: string;
  clientName: string;
  clientCnpj: string;
  revenueCount: string;
  totalValue: string;
  averageValue: string;
  lastRevenueDate: Date;
}

interface OverdueInstallmentsRawResult {
  totalOverdue: string;
  totalOverdueValue: string;
}

interface InstallmentConversionRawResult {
  totalInstallments: string;
  paidInstallments: string;
  pendingInstallments: string;
  overdueInstallments: string;
}

@Injectable()
export class RevenueChartsService {
  constructor(
    @InjectRepository(Revenue)
    private readonly revenueRepository: Repository<Revenue>,
    @InjectRepository(RevenueInstallment)
    private readonly installmentRepository: Repository<RevenueInstallment>,
  ) {}

  async getRevenuesByPeriod(
    fairId: string,
    period: string = 'monthly',
    startDate?: string,
    endDate?: string,
  ) {
    let dateFormat: string;

    switch (period) {
      case 'daily':
        dateFormat = '%Y-%m-%d';
        break;
      case 'weekly':
        dateFormat = '%Y-%u';
        break;
      case 'monthly':
      default:
        dateFormat = '%Y-%m';
        break;
    }

    const queryBuilder = this.revenueRepository
      .createQueryBuilder('revenue')
      .select([
        `DATE_FORMAT(revenue.createdAt, '${dateFormat}') as period`,
        'COUNT(revenue.id) as count',
        'SUM(revenue.contractValue) as totalValue',
        'SUM(CASE WHEN revenue.status = :paidStatus THEN revenue.contractValue ELSE 0 END) as paidValue',
        'SUM(CASE WHEN revenue.status = :pendingStatus THEN revenue.contractValue ELSE 0 END) as pendingValue',
        'SUM(CASE WHEN revenue.status = :overdueStatus THEN revenue.contractValue ELSE 0 END) as overdueValue',
      ])
      .where('revenue.fairId = :fairId', { fairId })
      .setParameters({
        paidStatus: RevenueStatus.PAGO,
        pendingStatus: RevenueStatus.PENDENTE,
        overdueStatus: RevenueStatus.EM_ATRASO,
      })
      .groupBy('period')
      .orderBy('period', 'ASC');

    if (startDate) {
      queryBuilder.andWhere('revenue.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('revenue.createdAt <= :endDate', { endDate });
    }

    const rawData: RevenuesByPeriodRawResult[] =
      await queryBuilder.getRawMany();

    const data = rawData.map((item, index) => {
      const previousValue =
        index > 0 ? parseInt(rawData[index - 1].totalValue) : 0;
      const currentValue = parseInt(item.totalValue);
      const revenueGrowth =
        previousValue > 0
          ? ((currentValue - previousValue) / previousValue) * 100
          : 0;

      return {
        period: item.period,
        periodLabel: this.formatPeriodLabel(item.period, period),
        count: parseInt(item.count),
        totalValue: parseInt(item.totalValue),
        paidValue: parseInt(item.paidValue),
        pendingValue: parseInt(item.pendingValue),
        overdueValue: parseInt(item.overdueValue),
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      };
    });

    const summary = {
      totalPeriods: data.length,
      averageRevenuePerPeriod:
        data.length > 0
          ? Math.round(
              data.reduce((sum, item) => sum + item.totalValue, 0) /
                data.length,
            )
          : 0,
      bestPeriod:
        data.length > 0
          ? data.reduce((max, item) =>
              item.totalValue > max.totalValue ? item : max,
            )
          : null,
      overallGrowth:
        data.length > 1
          ? Math.round(
              ((data[data.length - 1].totalValue - data[0].totalValue) /
                data[0].totalValue) *
                100 *
                100,
            ) / 100
          : 0,
    };

    return {
      fairId,
      period,
      data,
      summary,
    };
  }

  async getRevenuesByStatus(fairId: string) {
    const rawData: RevenuesByStatusRawResult[] = await this.revenueRepository
      .createQueryBuilder('revenue')
      .select([
        'revenue.status',
        'COUNT(revenue.id) as count',
        'SUM(revenue.contractValue) as totalValue',
      ])
      .where('revenue.fairId = :fairId', { fairId })
      .groupBy('revenue.status')
      .getRawMany();

    const totalValue = rawData.reduce(
      (sum, item) => sum + parseInt(item.totalValue),
      0,
    );
    const totalCount = rawData.reduce(
      (sum, item) => sum + parseInt(item.count),
      0,
    );

    const data: Record<
      string,
      { count: number; totalValue: number; percentage: number }
    > = {};
    rawData.forEach((item) => {
      const count = parseInt(item.count);
      const value = parseInt(item.totalValue);
      data[item.revenue_status] = {
        count,
        totalValue: value,
        percentage:
          totalCount > 0
            ? Math.round((count / totalCount) * 100 * 100) / 100
            : 0,
      };
    });

    const paidData = data[RevenueStatus.PAGO] || {
      count: 0,
      totalValue: 0,
      percentage: 0,
    };
    const overdueData = data[RevenueStatus.EM_ATRASO] || {
      count: 0,
      totalValue: 0,
      percentage: 0,
    };

    return {
      fairId,
      data,
      summary: {
        totalRevenues: totalCount,
        totalValue,
        paidPercentage: paidData.percentage,
        overduePercentage: overdueData.percentage,
      },
    };
  }

  async getRevenuesByPaymentMethod(fairId: string) {
    const rawData: RevenuesByPaymentMethodRawResult[] =
      await this.revenueRepository
        .createQueryBuilder('revenue')
        .select([
          'revenue.paymentMethod',
          'COUNT(revenue.id) as count',
          'SUM(revenue.contractValue) as totalValue',
        ])
        .where('revenue.fairId = :fairId', { fairId })
        .groupBy('revenue.paymentMethod')
        .getRawMany();

    const totalValue = rawData.reduce(
      (sum, item) => sum + parseInt(item.totalValue),
      0,
    );
    const totalCount = rawData.reduce(
      (sum, item) => sum + parseInt(item.count),
      0,
    );

    const data: Record<string, any> = {};
    rawData.forEach((item) => {
      const count = parseInt(item.count);
      const value = parseInt(item.totalValue);
      data[item.revenue_paymentMethod] = {
        count,
        totalValue: value,
        percentage:
          totalCount > 0
            ? Math.round((count / totalCount) * 100 * 100) / 100
            : 0,
        averageValue: count > 0 ? Math.round(value / count) : 0,
      };
    });

    const mostUsedMethod = rawData.reduce(
      (max, item) =>
        parseInt(item.count) > parseInt(max.count || '0') ? item : max,
      rawData[0] || ({} as RevenuesByPaymentMethodRawResult),
    );
    const highestValueMethod = rawData.reduce(
      (max, item) =>
        parseInt(item.totalValue) > parseInt(max.totalValue || '0')
          ? item
          : max,
      rawData[0] || ({} as RevenuesByPaymentMethodRawResult),
    );

    return {
      fairId,
      data,
      summary: {
        totalRevenues: totalCount,
        totalValue,
        mostUsedMethod: mostUsedMethod.revenue_paymentMethod || null,
        highestValueMethod: highestValueMethod.revenue_paymentMethod || null,
      },
    };
  }

  async getExecutiveSummary(fairId: string) {
    // Dados básicos
    const revenueStats = (await this.revenueRepository
      .createQueryBuilder('revenue')
      .select([
        'COUNT(revenue.id) as totalRevenues',
        'SUM(revenue.contractValue) as totalValue',
        'AVG(revenue.contractValue) as averageValue',
        'SUM(CASE WHEN revenue.status = :paidStatus THEN 1 ELSE 0 END) as paidRevenues',
        'SUM(CASE WHEN revenue.status = :pendingStatus THEN 1 ELSE 0 END) as pendingRevenues',
        'SUM(CASE WHEN revenue.status = :overdueStatus THEN 1 ELSE 0 END) as overdueRevenues',
      ])
      .where('revenue.fairId = :fairId', { fairId })
      .setParameters({
        paidStatus: RevenueStatus.PAGO,
        pendingStatus: RevenueStatus.PENDENTE,
        overdueStatus: RevenueStatus.EM_ATRASO,
      })
      .getRawOne()) as RevenueStatsRawResult;

    // Dados de parcelas
    const installmentStats = (await this.installmentRepository
      .createQueryBuilder('installment')
      .innerJoin('installment.revenue', 'revenue')
      .select([
        'COUNT(installment.id) as totalInstallments',
        'SUM(CASE WHEN installment.status = :paidStatus THEN 1 ELSE 0 END) as paidInstallments',
        'SUM(CASE WHEN installment.status = :overdueStatus THEN 1 ELSE 0 END) as overdueInstallments',
        'AVG(revenue.numberOfInstallments) as averageInstallments',
      ])
      .where('revenue.fairId = :fairId', { fairId })
      .setParameters({
        paidStatus: InstallmentStatus.PAGA,
        overdueStatus: InstallmentStatus.VENCIDA,
      })
      .getRawOne()) as InstallmentStatsRawResult;

    const totalRevenues = parseInt(revenueStats.totalRevenues || '0');
    const totalValue = parseInt(revenueStats.totalValue || '0');
    const paidRevenues = parseInt(revenueStats.paidRevenues || '0');
    const conversionRate =
      totalRevenues > 0 ? (paidRevenues / totalRevenues) * 100 : 0;

    return {
      fairId,
      generatedAt: new Date().toISOString(),
      data: {
        kpis: {
          totalRevenues: {
            value: totalRevenues,
            change: 0, // Implementar comparação com período anterior
            changeType: 'neutral',
            period: 'vs_last_month',
          },
          totalValue: {
            value: totalValue,
            formatted: `R$ ${(totalValue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            change: 0,
            changeType: 'neutral',
            period: 'vs_last_month',
          },
          averageRevenueValue: {
            value: Math.round(parseFloat(revenueStats.averageValue || '0')),
            formatted: `R$ ${(Math.round(parseFloat(revenueStats.averageValue || '0')) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            change: 0,
            changeType: 'neutral',
            period: 'vs_last_month',
          },
          conversionRate: {
            value: Math.round(conversionRate * 100) / 100,
            formatted: `${Math.round(conversionRate * 100) / 100}%`,
            change: 0,
            changeType: 'neutral',
            period: 'vs_last_month',
          },
        },
        quickStats: {
          paidRevenues: parseInt(revenueStats.paidRevenues || '0'),
          pendingRevenues: parseInt(revenueStats.pendingRevenues || '0'),
          overdueRevenues: parseInt(revenueStats.overdueRevenues || '0'),
          totalInstallments: parseInt(
            installmentStats.totalInstallments || '0',
          ),
          paidInstallments: parseInt(installmentStats.paidInstallments || '0'),
          overdueInstallments: parseInt(
            installmentStats.overdueInstallments || '0',
          ),
          averageInstallments:
            Math.round(
              parseFloat(installmentStats.averageInstallments || '0') * 100,
            ) / 100,
        },
        alerts: [], // Implementar lógica de alertas
      },
    };
  }

  async getOverdueInstallments(fairId: string) {
    // Implementação básica - pode ser expandida
    const overdueData = (await this.installmentRepository
      .createQueryBuilder('installment')
      .innerJoin('installment.revenue', 'revenue')
      .select([
        'COUNT(installment.id) as totalOverdue',
        'SUM(installment.valueCents) as totalOverdueValue',
      ])
      .where('revenue.fairId = :fairId', { fairId })
      .andWhere('installment.status = :overdueStatus', {
        overdueStatus: InstallmentStatus.VENCIDA,
      })
      .getRawOne()) as OverdueInstallmentsRawResult;

    return {
      fairId,
      data: {
        overview: {
          totalInstallments: 0, // Implementar contagem total
          overdueInstallments: parseInt(overdueData.totalOverdue || '0'),
          overduePercentage: 0, // Calcular percentual
          totalOverdueValue: parseInt(overdueData.totalOverdueValue || '0'),
        },
      },
    };
  }

  async getTopClients(fairId: string, limit: number = 10) {
    const rawData: TopClientsRawResult[] = await this.revenueRepository
      .createQueryBuilder('revenue')
      .innerJoin('revenue.client', 'client')
      .select([
        'client.id as clientId',
        'client.name as clientName',
        'client.cnpj as clientCnpj',
        'COUNT(revenue.id) as revenueCount',
        'SUM(revenue.contractValue) as totalValue',
        'AVG(revenue.contractValue) as averageValue',
        'MAX(revenue.createdAt) as lastRevenueDate',
      ])
      .where('revenue.fairId = :fairId', { fairId })
      .groupBy('client.id, client.name, client.cnpj')
      .orderBy('totalValue', 'DESC')
      .limit(limit)
      .getRawMany();

    const data = rawData.map((item, index) => ({
      rank: index + 1,
      clientId: item.clientId,
      clientName: item.clientName,
      clientCnpj: item.clientCnpj,
      totalValue: parseInt(item.totalValue),
      revenueCount: parseInt(item.revenueCount),
      averageRevenueValue: Math.round(parseFloat(item.averageValue)),
      paidPercentage: 0, // Implementar cálculo de percentual pago
      lastRevenueDate: item.lastRevenueDate,
    }));

    const totalValue = data.reduce((sum, item) => sum + item.totalValue, 0);

    return {
      fairId,
      limit,
      data,
      summary: {
        totalClients: data.length,
        topClientsValue: totalValue,
        topClientsPercentage: 0, // Calcular em relação ao total
        averageClientValue:
          data.length > 0 ? Math.round(totalValue / data.length) : 0,
      },
    };
  }

  async getInstallmentConversion(fairId: string) {
    // Implementação básica
    const installmentData = (await this.installmentRepository
      .createQueryBuilder('installment')
      .innerJoin('installment.revenue', 'revenue')
      .select([
        'COUNT(installment.id) as totalInstallments',
        'SUM(CASE WHEN installment.status = :paidStatus THEN 1 ELSE 0 END) as paidInstallments',
        'SUM(CASE WHEN installment.status = :pendingStatus THEN 1 ELSE 0 END) as pendingInstallments',
        'SUM(CASE WHEN installment.status = :overdueStatus THEN 1 ELSE 0 END) as overdueInstallments',
      ])
      .where('revenue.fairId = :fairId', { fairId })
      .setParameters({
        paidStatus: InstallmentStatus.PAGA,
        pendingStatus: InstallmentStatus.A_VENCER,
        overdueStatus: InstallmentStatus.VENCIDA,
      })
      .getRawOne()) as InstallmentConversionRawResult;

    const totalInstallments = parseInt(
      installmentData.totalInstallments || '0',
    );
    const paidInstallments = parseInt(installmentData.paidInstallments || '0');
    const pendingInstallments = parseInt(
      installmentData.pendingInstallments || '0',
    );
    const overdueInstallments = parseInt(
      installmentData.overdueInstallments || '0',
    );

    return {
      fairId,
      data: {
        funnel: {
          totalInstallments,
          paidInstallments,
          pendingInstallments,
          overdueInstallments,
          canceledInstallments: 0,
        },
        conversionRates: {
          paidRate:
            totalInstallments > 0
              ? Math.round((paidInstallments / totalInstallments) * 100 * 100) /
                100
              : 0,
          pendingRate:
            totalInstallments > 0
              ? Math.round(
                  (pendingInstallments / totalInstallments) * 100 * 100,
                ) / 100
              : 0,
          overdueRate:
            totalInstallments > 0
              ? Math.round(
                  (overdueInstallments / totalInstallments) * 100 * 100,
                ) / 100
              : 0,
          canceledRate: 0,
          onTimePaymentRate: 0, // Implementar cálculo
        },
        byInstallmentNumber: [], // Implementar agrupamento por número da parcela
      },
      insights: {
        bestInstallmentRate: 1,
        worstInstallmentRate: 3,
        averageConversionRate: 0,
        recommendedActions: [],
      },
    };
  }

  private formatPeriodLabel(period: string, type: string): string {
    switch (type) {
      case 'daily':
        return new Date(period).toLocaleDateString('pt-BR');
      case 'weekly': {
        const [year, week] = period.split('-');
        return `Semana ${week}/${year}`;
      }
      case 'monthly':
      default: {
        const [yearMonth, month] = period.split('-');
        const monthNames = [
          'Janeiro',
          'Fevereiro',
          'Março',
          'Abril',
          'Maio',
          'Junho',
          'Julho',
          'Agosto',
          'Setembro',
          'Outubro',
          'Novembro',
          'Dezembro',
        ];
        return `${monthNames[parseInt(month) - 1]} ${yearMonth}`;
      }
    }
  }
}
