import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Revenue } from '../revenues/entities/revenue.entity';
import { RevenueInstallment } from '../revenues/entities/revenue-installment.entity';
import { Visitor } from '../../visitors/entities/visitor.entity';
import { CheckIn } from '../../checkins/entity/checkins.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Fair } from '../../fairs/entity/fair.entity';
import { Stand } from '../stands/entities/stand.entity';
import { ExpensesService } from '../expenses/expenses.service';
import { OverheadExpensesService } from '../overhead/overhead-expenses.service';

// ─── Response types (ApexCharts-ready) ───────────────────────────────────────

export interface ApexDonutData {
  series: number[];
  labels: string[];
  colors: string[];
  total: number;
}

export interface ApexBarData {
  series: { name: string; data: number[] }[];
  categories: string[];
}

export interface FairKpi {
  receita: {
    totalContrato: number; // valor total dos contratos (base de cálculo)
    totalRecebido: number; // parcelas marcadas PAGA
    totalAReceber: number; // totalContrato - totalRecebido
    totalVencido: number; // parcelas VENCIDA não pagas
    inadimplencia: number; // % totalVencido / totalContrato
  };
  despesas: {
    total: number;
    diretas: number;
    rateadas: number;
  };
  resultado: {
    lucroProjetado: number; // totalContrato - despesas (se tudo pagar)
    lucroRealizado: number; // totalRecebido - despesas (caixa atual)
    margemProjetada: number; // % sobre totalContrato
    margemRealizada: number; // % sobre totalRecebido
    isProfitable: boolean; // baseado no projetado
  };
  visitantes: {
    total: number;
    checkins: number;
    taxaComparecimento: number; // %
    custoPorVisitante: number; // R$ (baseado em despesas de marketing)
    custoPorStand: number; // R$ (despesas de montagem / stands ocupados)
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PALETTE = [
  '#008FFB',
  '#00E396',
  '#FEB019',
  '#FF4560',
  '#775DD0',
  '#3F51B5',
  '#03A9F4',
  '#4CAF50',
  '#F9CE1D',
  '#FF9800',
];

const MONTH_NAMES = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

function fmtMonth(ym: string): string {
  const [year, month] = ym.split('-');
  return `${MONTH_NAMES[parseInt(month, 10) - 1]}/${year.slice(2)}`;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseFairIds(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class ChartsService {
  constructor(
    @InjectRepository(Revenue)
    private revenueRepo: Repository<Revenue>,
    @InjectRepository(RevenueInstallment)
    private installmentRepo: Repository<RevenueInstallment>,
    @InjectRepository(Visitor)
    private visitorRepo: Repository<Visitor>,
    @InjectRepository(CheckIn)
    private checkinRepo: Repository<CheckIn>,
    @InjectRepository(Expense)
    private expenseRepo: Repository<Expense>,
    @InjectRepository(Fair)
    private fairRepo: Repository<Fair>,
    @InjectRepository(Stand)
    private standRepo: Repository<Stand>,
    private expensesService: ExpensesService,
    private overheadExpensesService: OverheadExpensesService,
  ) {}

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async totalExpenses(fairId: string) {
    const [diretas, overheadDireto, overheadLegado] = await Promise.all([
      this.expensesService.getTotalByFair(fairId),
      this.expensesService.getTotalDirectOverheadForFair(fairId),
      this.overheadExpensesService.getTotalAllocatedForFair(fairId),
    ]);
    const rateadas = overheadDireto + overheadLegado;
    return {
      total: r2(diretas + rateadas),
      diretas: r2(diretas),
      rateadas: r2(rateadas),
    };
  }

  private visitorCount(fairId: string) {
    return this.visitorRepo
      .createQueryBuilder('v')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = v.registrationCode AND fv.fairsId = :fairId',
        { fairId },
      )
      .getCount();
  }

  private checkinCount(fairId: string) {
    return this.checkinRepo
      .createQueryBuilder('c')
      .innerJoin('c.visitor', 'v')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = v.registrationCode AND fv.fairsId = :fairId',
        { fairId },
      )
      .getCount();
  }

  private async fairNames(fairIds: string[]): Promise<Map<string, string>> {
    if (!fairIds.length) return new Map();
    const fairs = await this.fairRepo.find({ where: { id: In(fairIds) } });
    return new Map(fairs.map((f) => [f.id, f.name]));
  }

  // Soma todas as despesas (diretas + rateadas/overhead) cujo nome de categoria contenha qualquer um dos padrões (case-insensitive)
  private async totalExpensesByCategoriesPattern(
    fairId: string,
    patterns: string[],
  ): Promise<number> {
    // 1. Despesas diretas
    const qb = this.expenseRepo
      .createQueryBuilder('e')
      .innerJoin('categories', 'c', 'c.id = e.categoryId')
      .select('SUM(e.valor)', 'total')
      .where('e.fairId = :fairId AND e.isOverhead = false', { fairId });

    if (patterns.length > 0) {
      const conditions = patterns.map((_, i) => `LOWER(c.name) LIKE :p${i}`);
      qb.andWhere(`(${conditions.join(' OR ')})`);
      const params: Record<string, string> = {};
      patterns.forEach((p, i) => {
        params[`p${i}`] = `%${p.toLowerCase()}%`;
      });
      qb.setParameters(params);
    }
    const directRow = await qb.getRawOne();
    const directTotal = Number(directRow?.total ?? 0);

    // 2. Overhead direto alocado
    const allocDirect =
      await this.expensesService.findOverheadAllocatedForFair(fairId);
    const allocDirectTotal = allocDirect
      .filter((item) => {
        const catName = (item.category?.name ?? '').toLowerCase();
        return patterns.some((p) => catName.includes(p.toLowerCase()));
      })
      .reduce((sum, item) => sum + item.valorAlocado, 0);

    // 3. Overhead legado/global alocado
    const allocLegacy =
      await this.overheadExpensesService.findAllocatedForFair(fairId);
    const allocLegacyTotal = allocLegacy
      .filter((item) => {
        const catName = (item.category?.nome ?? '').toLowerCase();
        return patterns.some((p) => catName.includes(p.toLowerCase()));
      })
      .reduce((sum, item) => sum + item.valorAlocado, 0);

    return directTotal + allocDirectTotal + allocLegacyTotal;
  }

  // Despesas de marketing (categoria contém "marketing")
  private marketingExpenses(fairId: string): Promise<number> {
    return this.totalExpensesByCategoriesPattern(fairId, ['marketing']);
  }

  // Despesas de montagem/montadora (categoria contém "montagem" OU "montadora")
  private creationExpenses(fairId: string): Promise<number> {
    return this.totalExpensesByCategoriesPattern(fairId, [
      'montagem',
      'montadora',
    ]);
  }

  // Stands ocupados (com contrato vinculado)
  private occupiedStands(fairId: string): Promise<number> {
    return this.standRepo
      .createQueryBuilder('s')
      .where('s.fairId = :fairId AND s.revenueId IS NOT NULL', { fairId })
      .getCount();
  }

  // ─── 1. KPI Cards ─────────────────────────────────────────────────────────
  //
  //  GET /charts/fair/:fairId/kpi
  //
  //  Use no frontend para cards individuais — cada campo é um card:
  //    receita.totalContrato, receita.totalRecebido, receita.totalVencido
  //    despesas.total, resultado.lucroLiquido, resultado.margemLiquida
  //    visitantes.total, visitantes.taxaComparecimento

  async fairKpi(fairId: string): Promise<FairKpi> {
    const [
      revenues,
      paidRow,
      overdueRow,
      expenses,
      visitors,
      checkins,
      marketingExp,
      creationExp,
      standCount,
    ] = await Promise.all([
      this.revenueRepo.find({ where: { fairId } }),
      this.installmentRepo
        .createQueryBuilder('i')
        .innerJoin('i.revenue', 'r')
        .select('SUM(i.valueCents)', 'total')
        .where('r.fairId = :fairId AND i.status = :st', { fairId, st: 'PAGA' })
        .getRawOne(),
      this.installmentRepo
        .createQueryBuilder('i')
        .innerJoin('i.revenue', 'r')
        .select('SUM(i.valueCents)', 'total')
        .where('r.fairId = :fairId AND i.status = :st', {
          fairId,
          st: 'VENCIDA',
        })
        .getRawOne(),
      this.totalExpenses(fairId),
      this.visitorCount(fairId),
      this.checkinCount(fairId),
      this.marketingExpenses(fairId),
      this.creationExpenses(fairId),
      this.occupiedStands(fairId),
    ]);

    const totalContrato = r2(
      revenues.reduce((s, rv) => s + Number(rv.contractValue) / 100, 0),
    );
    const totalRecebido = r2(Number(paidRow?.total ?? 0) / 100);
    const totalVencido = r2(Number(overdueRow?.total ?? 0) / 100);
    const totalAReceber = r2(totalContrato - totalRecebido);
    const inadimplencia =
      totalContrato > 0 ? r2((totalVencido / totalContrato) * 100) : 0;

    const lucroProjetado = r2(totalContrato - expenses.total);
    const lucroRealizado = r2(totalRecebido - expenses.total);
    const margemProjetada =
      totalContrato > 0 ? r2((lucroProjetado / totalContrato) * 100) : 0;
    const margemRealizada =
      totalRecebido > 0 ? r2((lucroRealizado / totalRecebido) * 100) : 0;

    const taxaComparecimento =
      visitors > 0 ? r2((checkins / visitors) * 100) : 0;
    const custoPorVisitante = visitors > 0 ? r2(marketingExp / visitors) : 0;
    const custoPorStand = standCount > 0 ? r2(creationExp / standCount) : 0;

    return {
      receita: {
        totalContrato,
        totalRecebido,
        totalAReceber,
        totalVencido,
        inadimplencia,
      },
      despesas: {
        total: expenses.total,
        diretas: expenses.diretas,
        rateadas: expenses.rateadas,
      },
      resultado: {
        lucroProjetado,
        lucroRealizado,
        margemProjetada,
        margemRealizada,
        isProfitable: lucroProjetado > 0,
      },
      visitantes: {
        total: visitors,
        checkins,
        taxaComparecimento,
        custoPorVisitante,
        custoPorStand,
      },
    };
  }

  // ─── 2. Despesas por categoria — Donut ────────────────────────────────────
  //
  //  GET /charts/fair/:fairId/expenses-by-category
  //  ApexCharts: type: 'donut' | 'pie'
  //    series  → values
  //    labels  → chart.options.labels
  //    colors  → chart.options.colors

  async expensesByCategory(fairId: string): Promise<ApexDonutData> {
    const [directRows, allocDirect, allocLegacy] = await Promise.all([
      this.expenseRepo
        .createQueryBuilder('e')
        .innerJoin('categories', 'c', 'c.id = e.categoryId')
        .select('c.name', 'name')
        .addSelect('SUM(e.valor)', 'total')
        .where('e.fairId = :fairId AND e.isOverhead = false', { fairId })
        .groupBy('e.categoryId')
        .getRawMany(),
      this.expensesService.findOverheadAllocatedForFair(fairId),
      this.overheadExpensesService.findAllocatedForFair(fairId),
    ]);

    const map = new Map<string, number>();

    for (const r of directRows) {
      const k = r.name || 'Sem categoria';
      map.set(k, (map.get(k) ?? 0) + Number(r.total));
    }
    for (const item of allocDirect) {
      const k = item.category?.name || 'Sem categoria';
      map.set(k, (map.get(k) ?? 0) + item.valorAlocado);
    }
    for (const item of allocLegacy) {
      const k = item.category?.nome || 'Sem categoria';
      map.set(k, (map.get(k) ?? 0) + item.valorAlocado);
    }

    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);

    return {
      series: sorted.map(([, v]) => r2(v)),
      labels: sorted.map(([k]) => k),
      colors: sorted.map((_, i) => PALETTE[i % PALETTE.length]),
      total: r2(sorted.reduce((s, [, v]) => s + v, 0)),
    };
  }

  // ─── 3. Receitas por status — Donut ───────────────────────────────────────
  //
  //  GET /charts/fair/:fairId/revenues-by-status
  //  ApexCharts: type: 'donut'

  async revenuesByStatus(fairId: string): Promise<ApexDonutData> {
    const rows = await this.revenueRepo
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('SUM(r.contractValue)', 'total')
      .where('r.fairId = :fairId', { fairId })
      .groupBy('r.status')
      .getRawMany();

    const cfg: Record<string, { label: string; color: string }> = {
      PAGO: { label: 'Pago', color: '#00E396' },
      EM_ANDAMENTO: { label: 'Em andamento', color: '#008FFB' },
      PENDENTE: { label: 'Pendente', color: '#FEB019' },
      EM_ATRASO: { label: 'Em atraso', color: '#FF4560' },
      CANCELADO: { label: 'Cancelado', color: '#775DD0' },
    };
    const order = [
      'PAGO',
      'EM_ANDAMENTO',
      'PENDENTE',
      'EM_ATRASO',
      'CANCELADO',
    ];
    const rowMap = new Map(
      rows.map((r) => [r.status as string, Number(r.total) / 100]),
    );
    const filtered = order.filter((s) => rowMap.has(s));

    return {
      series: filtered.map((s) => r2(rowMap.get(s)!)),
      labels: filtered.map((s) => cfg[s]?.label ?? s),
      colors: filtered.map((s) => cfg[s]?.color ?? '#999'),
      total: r2([...rowMap.values()].reduce((a, b) => a + b, 0)),
    };
  }

  // ─── 4. Forecast de recebimento — Stacked Bar por mês ─────────────────────
  //
  //  GET /charts/fair/:fairId/revenue-forecast
  //  ApexCharts: type: 'bar', stacked: true
  //    series[0] = A Vencer (azul)
  //    series[1] = Em Atraso (vermelho)

  async revenueForecast(fairId: string): Promise<ApexBarData> {
    const rows = await this.installmentRepo
      .createQueryBuilder('i')
      .innerJoin('i.revenue', 'r')
      .select("DATE_FORMAT(i.dueDate, '%Y-%m')", 'month')
      .addSelect('i.status', 'status')
      .addSelect('SUM(i.valueCents)', 'total')
      .where('r.fairId = :fairId AND i.status IN (:...st)', {
        fairId,
        st: ['A_VENCER', 'VENCIDA'],
      })
      .groupBy("DATE_FORMAT(i.dueDate, '%Y-%m'), i.status")
      .orderBy("DATE_FORMAT(i.dueDate, '%Y-%m')", 'ASC')
      .getRawMany();

    const monthMap = new Map<string, { aVencer: number; vencida: number }>();
    for (const r of rows) {
      if (!monthMap.has(r.month))
        monthMap.set(r.month, { aVencer: 0, vencida: 0 });
      const entry = monthMap.get(r.month)!;
      const val = Number(r.total) / 100;
      if (r.status === 'A_VENCER') entry.aVencer += val;
      if (r.status === 'VENCIDA') entry.vencida += val;
    }

    const months = [...monthMap.keys()].sort();

    return {
      series: [
        {
          name: 'A Vencer',
          data: months.map((m) => r2(monthMap.get(m)!.aVencer)),
        },
        {
          name: 'Em Atraso',
          data: months.map((m) => r2(monthMap.get(m)!.vencida)),
        },
      ],
      categories: months.map(fmtMonth),
    };
  }

  // ─── 5. Evolução de inscrições — Line ─────────────────────────────────────
  //
  //  GET /charts/fair/:fairId/visitors-timeline
  //  ApexCharts: type: 'line'
  //    series[0] = Acumulado (linha principal)
  //    series[1] = No dia (linha secundária / barras)

  async visitorsTimeline(fairId: string): Promise<ApexBarData> {
    const rows = await this.visitorRepo
      .createQueryBuilder('v')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = v.registrationCode AND fv.fairsId = :fairId',
        { fairId },
      )
      .select("DATE_FORMAT(v.registrationDate, '%Y-%m-%d')", 'date')
      .addSelect('COUNT(v.registrationCode)', 'count')
      .groupBy("DATE_FORMAT(v.registrationDate, '%Y-%m-%d')")
      .orderBy("DATE_FORMAT(v.registrationDate, '%Y-%m-%d')", 'ASC')
      .getRawMany();

    let cumulative = 0;
    const daily = rows.map((r) => Number(r.count));
    const cumul = daily.map((c) => {
      cumulative += c;
      return cumulative;
    });
    const categories = rows.map((r) => {
      const [, m, d] = r.date.split('-');
      return `${d}/${m}`;
    });

    return {
      series: [
        { name: 'Acumulado', data: cumul },
        { name: 'No dia', data: daily },
      ],
      categories,
    };
  }

  // ─── 6. Check-ins por horário — Bar ───────────────────────────────────────
  //
  //  GET /charts/fair/:fairId/checkins-by-hour
  //  ApexCharts: type: 'bar'
  //  Mostra concentração de público ao longo do dia (00h–23h)

  async checkinsByHour(fairId: string): Promise<ApexBarData> {
    const rows = await this.checkinRepo
      .createQueryBuilder('c')
      .innerJoin('c.visitor', 'v')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = v.registrationCode AND fv.fairsId = :fairId',
        { fairId },
      )
      .select('HOUR(c.createdAt)', 'hour')
      .addSelect('COUNT(c.id)', 'count')
      .groupBy('HOUR(c.createdAt)')
      .orderBy('HOUR(c.createdAt)', 'ASC')
      .getRawMany();

    const hourMap = new Map(rows.map((r) => [Number(r.hour), Number(r.count)]));
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return {
      series: [
        { name: 'Check-ins', data: hours.map((h) => hourMap.get(h) ?? 0) },
      ],
      categories: hours.map((h) => `${String(h).padStart(2, '0')}h`),
    };
  }

  // ─── 7. Receita vs Despesa vs Lucro por feira — Grouped Bar ───────────────
  //
  //  GET /charts/compare?fairIds=uuid1,uuid2
  //  ApexCharts: type: 'bar', grouped
  //  Visão macro da empresa: comparar feiras lado a lado

  async compareRevenueVsExpenses(fairIds: string[]): Promise<ApexBarData> {
    const names = await this.fairNames(fairIds);
    const ordered = fairIds.filter((id) => names.has(id));

    const data = await Promise.all(
      ordered.map(async (fairId) => {
        const [revenues, expenses] = await Promise.all([
          this.revenueRepo.find({ where: { fairId } }),
          this.totalExpenses(fairId),
        ]);
        const receita = r2(
          revenues.reduce((s, rv) => s + Number(rv.contractValue) / 100, 0),
        );
        return {
          receita,
          despesa: expenses.total,
          lucro: r2(receita - expenses.total),
        };
      }),
    );

    return {
      series: [
        { name: 'Receita', data: data.map((d) => d.receita) },
        { name: 'Despesas', data: data.map((d) => d.despesa) },
        { name: 'Lucro', data: data.map((d) => d.lucro) },
      ],
      categories: ordered.map((id) => names.get(id)!),
    };
  }

  // ─── 8. Margem líquida por feira — Horizontal Bar ─────────────────────────
  //
  //  GET /charts/compare/margins?fairIds=uuid1,uuid2
  //  ApexCharts: type: 'bar', horizontal: true
  //  Ranking de eficiência entre feiras

  async compareMargins(fairIds: string[]): Promise<ApexBarData> {
    const names = await this.fairNames(fairIds);
    const ordered = fairIds.filter((id) => names.has(id));

    const data = await Promise.all(
      ordered.map(async (fairId) => {
        const [revenues, expenses] = await Promise.all([
          this.revenueRepo.find({ where: { fairId } }),
          this.totalExpenses(fairId),
        ]);
        const receita = revenues.reduce(
          (s, rv) => s + Number(rv.contractValue) / 100,
          0,
        );
        const lucro = receita - expenses.total;
        return r2(receita > 0 ? (lucro / receita) * 100 : 0);
      }),
    );

    return {
      series: [{ name: 'Margem Líquida %', data }],
      categories: ordered.map((id) => names.get(id)!),
    };
  }

  // ─── 9. Overhead vs Diretas por feira — Stacked Bar ───────────────────────
  //
  //  GET /charts/compare/expenses-breakdown?fairIds=uuid1,uuid2
  //  ApexCharts: type: 'bar', stacked: true
  //  Mostra quanto do custo de cada feira é compartilhado

  async compareExpensesBreakdown(fairIds: string[]): Promise<ApexBarData> {
    const names = await this.fairNames(fairIds);
    const ordered = fairIds.filter((id) => names.has(id));
    const data = await Promise.all(ordered.map((id) => this.totalExpenses(id)));

    return {
      series: [
        { name: 'Diretas', data: data.map((d) => d.diretas) },
        { name: 'Rateadas', data: data.map((d) => d.rateadas) },
      ],
      categories: ordered.map((id) => names.get(id)!),
    };
  }
}

export { parseFairIds };
