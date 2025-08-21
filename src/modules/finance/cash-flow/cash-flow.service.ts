import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CashFlow } from './entities/cash-flow.entity';
import { CreateCashFlowDto } from './dto/create-cash-flow.dto';
import { UpdateCashFlowDto } from './dto/update-cash-flow.dto';
import { ExpensesService } from '../expenses/expenses.service';
import { RevenuesService } from '../revenues/revenues.service';

@Injectable()
export class CashFlowService {
  constructor(
    @InjectRepository(CashFlow)
    private cashFlowRepository: Repository<CashFlow>,
    private expensesService: ExpensesService,
    private revenuesService: RevenuesService,
  ) {}

  async create(createCashFlowDto: CreateCashFlowDto): Promise<CashFlow> {
    // Se não foram fornecidos os totais, calcular automaticamente
    if (!createCashFlowDto.totalRevenue || !createCashFlowDto.totalExpenses) {
      const calculated = await this.calculateTotalsForPeriod(
        createCashFlowDto.fairId,
        new Date(createCashFlowDto.period),
      );

      createCashFlowDto.totalRevenue = calculated.totalRevenue;
      createCashFlowDto.totalExpenses = calculated.totalExpenses;
    }

    // Calcular saldo líquido e margem de lucro
    const netBalance =
      createCashFlowDto.totalRevenue - createCashFlowDto.totalExpenses;
    const profitMargin =
      createCashFlowDto.totalRevenue > 0
        ? (netBalance / createCashFlowDto.totalRevenue) * 100
        : 0;

    const cashFlow = this.cashFlowRepository.create({
      ...createCashFlowDto,
      netBalance,
      profitMargin,
    });

    return await this.cashFlowRepository.save(cashFlow);
  }

  async findAll(): Promise<CashFlow[]> {
    return await this.cashFlowRepository.find({
      relations: ['fair'],
      order: { period: 'DESC' },
    });
  }

  async findByFair(fairId: string): Promise<CashFlow[]> {
    return await this.cashFlowRepository.find({
      where: { fairId },
      relations: ['fair'],
      order: { period: 'DESC' },
    });
  }

  async findByPeriod(startDate: Date, endDate: Date): Promise<CashFlow[]> {
    return await this.cashFlowRepository.find({
      where: {
        period: Between(startDate, endDate),
      },
      relations: ['fair'],
      order: { period: 'DESC' },
    });
  }

  async findOne(id: string): Promise<CashFlow> {
    const cashFlow = await this.cashFlowRepository.findOne({
      where: { id },
      relations: ['fair'],
    });

    if (!cashFlow) {
      throw new NotFoundException(`Fluxo de caixa com ID ${id} não encontrado`);
    }

    return cashFlow;
  }

  async update(
    id: string,
    updateCashFlowDto: UpdateCashFlowDto,
  ): Promise<CashFlow> {
    const cashFlow = await this.findOne(id);

    // Se estiver atualizando receitas ou despesas, recalcular
    if (
      updateCashFlowDto.totalRevenue !== undefined ||
      updateCashFlowDto.totalExpenses !== undefined
    ) {
      const totalRevenue =
        updateCashFlowDto.totalRevenue ?? cashFlow.totalRevenue;
      const totalExpenses =
        updateCashFlowDto.totalExpenses ?? cashFlow.totalExpenses;

      const netBalance = totalRevenue - totalExpenses;
      const profitMargin =
        totalRevenue > 0 ? (netBalance / totalRevenue) * 100 : 0;

      // Atualizar diretamente no objeto cashFlow
      cashFlow.netBalance = netBalance;
      cashFlow.profitMargin = profitMargin;
    }

    Object.assign(cashFlow, updateCashFlowDto);
    return await this.cashFlowRepository.save(cashFlow);
  }

  async remove(id: string): Promise<void> {
    const cashFlow = await this.findOne(id);
    await this.cashFlowRepository.remove(cashFlow);
  }

  // Método para calcular totais automaticamente
  async calculateTotalsForPeriod(
    fairId: string,
    period: Date,
  ): Promise<{
    totalRevenue: number;
    totalExpenses: number;
  }> {
    // Calcular total de receitas para o período
    const revenues = await this.revenuesService.findByFair(fairId);
    const totalRevenue = revenues.reduce(
      (sum, revenue) => sum + revenue.contractValue,
      0,
    );

    // Calcular total de despesas para o período
    const totalExpenses = await this.expensesService.getTotalByFair(fairId);

    return {
      totalRevenue,
      totalExpenses,
    };
  }

  // Método para gerar relatório consolidado
  async generateConsolidatedReport(fairId: string): Promise<{
    fairId: string;
    totalRevenue: number;
    totalExpenses: number;
    netBalance: number;
    profitMargin: number;
    isProfitable: boolean;
    summary: string;
  }> {
    const revenues = await this.revenuesService.findByFair(fairId);
    const totalRevenue = revenues.reduce(
      (sum, revenue) => sum + revenue.contractValue,
      0,
    );
    const totalExpenses = await this.expensesService.getTotalByFair(fairId);
    const netBalance = totalRevenue - totalExpenses;
    const profitMargin =
      totalRevenue > 0 ? (netBalance / totalRevenue) * 100 : 0;
    const isProfitable = netBalance > 0;

    let summary = '';
    if (isProfitable) {
      summary = `Feira lucrativa com margem de ${profitMargin.toFixed(2)}%`;
    } else {
      summary = `Feira com prejuízo de R$ ${Math.abs(netBalance).toFixed(2)}`;
    }

    return {
      fairId,
      totalRevenue,
      totalExpenses,
      netBalance,
      profitMargin,
      isProfitable,
      summary,
    };
  }

  // Método para análise de tendências
  async analyzeTrends(
    fairId: string,
    months: number = 6,
  ): Promise<{
    periods: string[];
    revenues: number[];
    expenses: number[];
    balances: number[];
    trend: 'increasing' | 'decreasing' | 'stable';
  }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const cashFlows = await this.findByPeriod(startDate, endDate);

    const periods = cashFlows.map((cf) => cf.period.toISOString().slice(0, 7));
    const revenues = cashFlows.map((cf) => cf.totalRevenue);
    const expenses = cashFlows.map((cf) => cf.totalExpenses);
    const balances = cashFlows.map((cf) => cf.netBalance);

    // Determinar tendência
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (balances.length >= 2) {
      const firstHalf = balances.slice(0, Math.floor(balances.length / 2));
      const secondHalf = balances.slice(Math.floor(balances.length / 2));

      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      if (secondAvg > firstAvg * 1.1) trend = 'increasing';
      else if (secondAvg < firstAvg * 0.9) trend = 'decreasing';
    }

    return {
      periods,
      revenues,
      expenses,
      balances,
      trend,
    };
  }

  // Método para comparar feiras
  async compareFairs(fairIds: string[]): Promise<
    {
      fairId: string;
      totalRevenue: number;
      totalExpenses: number;
      netBalance: number;
      profitMargin: number;
      rank: number;
    }[]
  > {
    const comparisons = await Promise.all(
      fairIds.map(async (fairId) => {
        const report = await this.generateConsolidatedReport(fairId);
        return {
          fairId,
          totalRevenue: report.totalRevenue,
          totalExpenses: report.totalExpenses,
          netBalance: report.netBalance,
          profitMargin: report.profitMargin,
          rank: 0, // Será definido abaixo
        };
      }),
    );

    // Ordenar por margem de lucro e definir ranking
    comparisons.sort((a, b) => b.profitMargin - a.profitMargin);
    comparisons.forEach((comp, index) => {
      comp.rank = index + 1;
    });

    return comparisons;
  }
}
