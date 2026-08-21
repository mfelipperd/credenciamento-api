import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CashFlow } from './entities/cash-flow.entity';
import { CreateCashFlowDto } from './dto/create-cash-flow.dto';
import { UpdateCashFlowDto } from './dto/update-cash-flow.dto';
import { ExpensesService } from '../expenses/expenses.service';
import { OverheadExpensesService } from '../overhead/overhead-expenses.service';
import { RevenuesService } from '../revenues/revenues.service';
import { ProfitDistributionService } from '../../partners/profit-distribution.service';
import { Fair } from '../../fairs/entity/fair.entity';
import {
  RevenueStatus,
  InstallmentStatus,
} from '../common/enums/finance.enums';
import { calculateTax, TaxAnnex } from '../common/tax-calculator';

@Injectable()
export class CashFlowService {
  private static isPermuta(notes: string | null): boolean {
    return /permuta/i.test(notes ?? '');
  }

  private static toReais(cents: number): number {
    return Math.round((Number(cents) / 100) * 100) / 100;
  }

  constructor(
    @InjectRepository(CashFlow)
    private cashFlowRepository: Repository<CashFlow>,
    private expensesService: ExpensesService,
    private overheadExpensesService: OverheadExpensesService,
    private revenuesService: RevenuesService,
    private profitDistributionService: ProfitDistributionService,
    @InjectRepository(Fair)
    private fairRepository: Repository<Fair>,
  ) {}

  /**
   * Total real de despesas de uma feira = diretas + rateadas (ambos os sistemas).
   *
   * - diretas           → finance_expenses WHERE isOverhead = false
   * - overhead direto   → finance_expenses WHERE isOverhead = true, calculado via expense_fair_allocations
   * - overhead legado   → overhead_expenses alocadas para esta feira via overhead_expense_allocations
   */
  private async getTotalExpenses(fairId: string): Promise<number> {
    const [diretas, overheadDireto, overheadLegado] = await Promise.all([
      this.expensesService.getTotalByFair(fairId),
      this.expensesService.getTotalDirectOverheadForFair(fairId),
      this.overheadExpensesService.getTotalAllocatedForFair(fairId),
    ]);
    return Math.round((diretas + overheadDireto + overheadLegado) * 100) / 100;
  }

  async create(createCashFlowDto: CreateCashFlowDto): Promise<CashFlow> {
    // Se não foram fornecidos os totais, calcular automaticamente
    if (!createCashFlowDto.totalRevenue || !createCashFlowDto.totalExpenses) {
      const calculated = await this.calculateTotalsForPeriod(
        createCashFlowDto.fairId,
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
  async calculateTotalsForPeriod(fairId: string): Promise<{
    totalRevenue: number;
    totalExpenses: number;
  }> {
    // Calcular total de receitas para o período
    const revenues = await this.revenuesService.findByFair(fairId);
    const totalRevenue = revenues.reduce(
      (sum, revenue) => sum + revenue.contractValue,
      0,
    );

    // Calcular total de despesas para o período (diretas + rateadas de ambos os sistemas)
    const totalExpenses = await this.getTotalExpenses(fairId);

    return {
      totalRevenue,
      totalExpenses,
    };
  }

  async generateConsolidatedReport(
    fairId: string,
    options: { rbt12?: number; annex?: TaxAnnex } = {},
  ): Promise<{
    fairId: string;
    fairName: string;
    totalRevenue: number;
    receivedRevenue: number;
    receivableRevenue: number;
    permutaRevenue: number;
    totalExpenses: number;
    taxes: {
      cnae: '8230-0/01';
      annex: TaxAnnex;
      annualRevenue: number | null;
      annualAmount: number | null;
      rbt12: number | null;
      rbt12Complete: boolean;
      bracket: number | null;
      nominalRate: number | null;
      deduction: number | null;
      effectiveRate: number | null;
      amount: number | null;
      message: string;
    };
    netBalanceAfterTaxes: number | null;
    netBalance: number;
    profitMargin: number;
    isProfitable: boolean;
    summary: string;
  }> {
    const fair = await this.fairRepository.findOne({ where: { id: fairId } });
    if (!fair) {
      throw new NotFoundException(`Feira com ID ${fairId} nao encontrada`);
    }

    const revenues = (await this.revenuesService.findByFair(fairId)).filter(
      (revenue) => revenue.status !== RevenueStatus.CANCELADO,
    );
    const taxableRevenues = revenues.filter(
      (revenue) => !CashFlowService.isPermuta(revenue.notes),
    );
    const totalRevenue = taxableRevenues.reduce(
      (sum, revenue) => sum + CashFlowService.toReais(revenue.contractValue),
      0,
    );
    const permutaRevenue = revenues
      .filter((revenue) => CashFlowService.isPermuta(revenue.notes))
      .reduce(
        (sum, revenue) => sum + CashFlowService.toReais(revenue.contractValue),
        0,
      );
    const receivedRevenue = taxableRevenues.reduce(
      (sum, revenue) =>
        sum +
        (revenue.installments ?? [])
          .filter(
            (installment) => installment.status === InstallmentStatus.PAGA,
          )
          .reduce(
            (installmentSum, installment) =>
              installmentSum + installment.valueCents,
            0,
          ) /
          100,
      0,
    );
    const receivableRevenue = Math.max(totalRevenue - receivedRevenue, 0);
    const totalExpenses = await this.getTotalExpenses(fairId);

    const allRevenues = (await this.revenuesService.findAll()).filter(
      (revenue) =>
        revenue.status !== RevenueStatus.CANCELADO &&
        !CashFlowService.isPermuta(revenue.notes),
    );
    const fairYear = (
      fair.startDate ??
      fair.endDate ??
      new Date()
    ).getFullYear();
    const fairsOfYear = await this.fairRepository.find();
    const fairIdsOfYear = new Set(
      fairsOfYear
        .filter(
          (item) =>
            (item.startDate ?? item.endDate)?.getFullYear() === fairYear,
        )
        .map((item) => item.id),
    );
    const calculatedRbt12 = allRevenues
      .filter((revenue) => fairIdsOfYear.has(revenue.fairId))
      .reduce(
        (sum, revenue) => sum + CashFlowService.toReais(revenue.contractValue),
        0,
      );
    const hasCalculatedRbt12 = calculatedRbt12 > 0;
    const annualRevenue =
      options.rbt12 ?? (hasCalculatedRbt12 ? calculatedRbt12 : null);
    const rbt12 = annualRevenue;
    const annex = options.annex ?? 'III';
    const taxCalculation = annualRevenue
      ? calculateTax(annualRevenue, totalRevenue, annex)
      : null;
    const taxAmount = taxCalculation?.amount ?? null;
    const netBalanceAfterTaxes =
      taxAmount === null ? null : totalRevenue - totalExpenses - taxAmount;
    const netBalance = netBalanceAfterTaxes ?? totalRevenue - totalExpenses;
    const profitMargin =
      totalRevenue > 0 ? (netBalance / totalRevenue) * 100 : 0;
    const isProfitable = netBalance > 0;
    const summary = isProfitable
      ? `Feira lucrativa com margem de ${profitMargin.toFixed(2)}%`
      : `Feira com prejuizo de R$ ${Math.abs(netBalance).toFixed(2)}`;

    return {
      fairId,
      fairName: fair.name,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      receivedRevenue: Math.round(receivedRevenue * 100) / 100,
      receivableRevenue: Math.round(receivableRevenue * 100) / 100,
      permutaRevenue: Math.round(permutaRevenue * 100) / 100,
      totalExpenses,
      taxes: {
        cnae: '8230-0/01',
        annex,
        annualRevenue,
        annualAmount: annualRevenue
          ? (calculateTax(annualRevenue, annualRevenue, annex)?.amount ?? null)
          : null,
        rbt12,
        rbt12Complete: options.rbt12 !== undefined,
        bracket: taxCalculation?.bracket ?? null,
        nominalRate: taxCalculation?.nominalRate ?? null,
        deduction: taxCalculation?.deduction ?? null,
        effectiveRate: taxCalculation?.effectiveRate ?? null,
        amount: taxAmount,
        message:
          options.rbt12 !== undefined
            ? ''
            : "Estimativa tributaria - RBT12 incompleto. O valor definitivo depende do faturamento total da Oficina d'Ideias nos 12 meses anteriores.",
      },
      netBalanceAfterTaxes,
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

  // Método para análise completa de fluxo de caixa de uma feira
  async getFairCashFlowAnalysis(fairId: string): Promise<{
    fairId: string;
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    isProfitable: boolean;
    revenueCount: number;
    expenseCount: number;
    averageRevenue: number;
    averageExpense: number;
    largestRevenue: number;
    largestExpense: number;
    performance: 'excellent' | 'good' | 'average' | 'poor';
    recommendations: string[];
    summary: string;
  }> {
    // Buscar receitas da feira
    const revenues = await this.revenuesService.findByFair(fairId);
    const totalRevenue = revenues.reduce((sum, revenue) => {
      // contractValue está em centavos (bigint), converter para reais
      const valueInCents = Number(revenue.contractValue) || 0;
      const valueInReais = valueInCents / 100;
      return sum + valueInReais;
    }, 0);
    const revenueCount = revenues.length;
    const averageRevenue = revenueCount > 0 ? totalRevenue / revenueCount : 0;
    const largestRevenue =
      revenueCount > 0
        ? Math.max(...revenues.map((r) => (Number(r.contractValue) || 0) / 100))
        : 0;

    // Buscar despesas da feira (diretas + rateadas de ambos os sistemas)
    const totalExpenses = await this.getTotalExpenses(fairId);

    const [directExpenses, allocatedDirect, allocatedLegacy] =
      await Promise.all([
        this.expensesService.findAllByFair(fairId),
        this.expensesService.findOverheadAllocatedForFair(fairId),
        this.overheadExpensesService.findAllocatedForFair(fairId),
      ]);

    // Todos os valores individuais (usando valorAlocado para os rateados)
    const allExpenseValues = [
      ...directExpenses.map((e) => e.valor),
      ...allocatedDirect.map((e) => e.valorAlocado),
      ...allocatedLegacy.map((e) => e.valorAlocado),
    ];
    const expenseCount = allExpenseValues.length;
    const averageExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;
    const largestExpense = expenseCount > 0 ? Math.max(...allExpenseValues) : 0;

    // Calcular métricas
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin =
      totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const isProfitable = netProfit > 0;

    // Determinar performance
    let performance: 'excellent' | 'good' | 'average' | 'poor';
    if (profitMargin >= 30) performance = 'excellent';
    else if (profitMargin >= 15) performance = 'good';
    else if (profitMargin >= 0) performance = 'average';
    else performance = 'poor';

    // Gerar recomendações
    const recommendations: string[] = [];

    if (profitMargin < 0) {
      recommendations.push(
        'Reduza custos operacionais para melhorar a lucratividade',
      );
      recommendations.push('Revise preços dos produtos/serviços oferecidos');
    } else if (profitMargin < 10) {
      recommendations.push(
        'Considere otimizar processos para reduzir despesas',
      );
      recommendations.push('Avalie oportunidades de aumentar receitas');
    } else if (profitMargin >= 30) {
      recommendations.push('Excelente performance! Mantenha os padrões atuais');
      recommendations.push(
        'Considere reinvestir parte do lucro para crescimento',
      );
    }

    if (revenueCount === 0) {
      recommendations.push(
        'Nenhuma receita registrada - verifique se há vendas não cadastradas',
      );
    }

    if (expenseCount === 0) {
      recommendations.push(
        'Nenhuma despesa registrada - verifique se todos os custos foram contabilizados',
      );
    }

    // Gerar resumo
    let summary = '';
    if (isProfitable) {
      summary = `Feira lucrativa com margem de ${profitMargin.toFixed(2)}%. `;
      summary += `Receita total: R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} `;
      summary += `e despesas: R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. `;
      summary += `Lucro líquido: R$ ${netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
    } else {
      summary = `Feira com prejuízo de R$ ${Math.abs(netProfit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. `;
      summary += `Margem: ${profitMargin.toFixed(2)}%. `;
      summary += `Receita: R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} `;
      summary += `e despesas: R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
    }

    return {
      fairId,
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      isProfitable,
      revenueCount,
      expenseCount,
      averageRevenue: Math.round(averageRevenue * 100) / 100,
      averageExpense: Math.round(averageExpense * 100) / 100,
      largestRevenue,
      largestExpense,
      performance,
      recommendations,
      summary,
    };
  }

  // Método para distribuir lucro entre sócios
  async distributeProfitToPartners(fairId: string): Promise<{
    fairId: string;
    totalProfit: number;
    distribution: {
      partnerId: string;
      partnerName: string;
      percentage: number;
      share: number;
    }[];
  }> {
    // Obter análise de fluxo de caixa da feira
    const analysis = await this.getFairCashFlowAnalysis(fairId);

    if (!analysis.isProfitable) {
      throw new Error(
        'Não é possível distribuir lucro de uma feira que não teve lucro',
      );
    }

    const totalProfit = analysis.netProfit;

    // Calcular distribuição sem efetuar
    const distribution =
      await this.profitDistributionService.calculateProfitDistribution(
        fairId,
        totalProfit,
      );

    // Efetuar a distribuição
    await this.profitDistributionService.distributeProfit(fairId, totalProfit);

    return {
      fairId,
      totalProfit,
      distribution,
    };
  }
}
