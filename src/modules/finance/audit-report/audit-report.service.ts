import { Injectable, InternalServerErrorException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as puppeteer from 'puppeteer';
import { Fair } from 'src/modules/fairs/entity/fair.entity';
import { FairPartner } from 'src/modules/partners/entities/fair-partner.entity';
import { Partner } from 'src/modules/partners/entities/partner.entity';
import { Revenue } from '../revenues/entities/revenue.entity';
import { RevenuesService } from '../revenues/revenues.service';
import { ExpensesService } from '../expenses/expenses.service';
import { OverheadExpensesService } from '../overhead/overhead-expenses.service';
import { CashFlowService } from '../cash-flow/cash-flow.service';
import { TaxAnnex } from '../common/tax-calculator';

interface RevenueRow {
  data: Date;
  clienteOrigem: string;
  canalAquisicao: string;
  formaPagamento: string;
  parcelas: number;
  status: string;
  valor: number;
  isPermuta: boolean;
  isCancelado: boolean;
}

interface ExpenseRow {
  data: Date;
  descricao: string;
  fornecedor: string;
  categoria: string;
  valor: number;
  grupo: 'direta' | 'rateada';
  detalheRateio: string | null;
}

interface SocioRow {
  nome: string;
  percentual: number;
  valor: number;
}

export interface AuditReportData {
  generatedAt: Date;
  fair: Fair;
  revenueRows: RevenueRow[];
  expenseRows: ExpenseRow[];
  totals: {
    receitaBrutaTributavel: number;
    receitaPermuta: number;
    despesasDiretas: number;
    despesasRateadas: number;
    despesasTotal: number;
    imposto: {
      cnae: string;
      anexo: TaxAnnex;
      rbt12: number | null;
      rbt12Completo: boolean;
      faixa: number | null;
      aliquotaNominal: number | null;
      parcelaDeduzir: number | null;
      aliquotaEfetiva: number | null;
      valor: number | null;
      mensagemSistema: string;
    };
    lucroLiquido: number;
    profitMargin: number;
  };
  socios: SocioRow[];
}

function fornecedorFromDescricao(descricao: string | null): string {
  if (!descricao) return 'dado não disponível';
  const idx = descricao.indexOf(' - ');
  if (idx === -1) return 'dado não disponível';
  return descricao.slice(idx + 3).trim() || 'dado não disponível';
}

@Injectable()
export class AuditReportService {
  private readonly logger = new Logger(AuditReportService.name);

  constructor(
    @InjectRepository(Fair) private readonly fairRepository: Repository<Fair>,
    @InjectRepository(FairPartner)
    private readonly fairPartnerRepository: Repository<FairPartner>,
    @InjectRepository(Partner) private readonly partnerRepository: Repository<Partner>,
    private readonly revenuesService: RevenuesService,
    private readonly expensesService: ExpensesService,
    private readonly overheadExpensesService: OverheadExpensesService,
    private readonly cashFlowService: CashFlowService,
  ) {}

  async buildReportData(
    fairId: string,
    options: { rbt12?: number; annex?: TaxAnnex } = {},
  ): Promise<AuditReportData> {
    const fair = await this.fairRepository.findOne({ where: { id: fairId } });
    if (!fair) {
      throw new NotFoundException(`Feira com ID ${fairId} não encontrada`);
    }

    const [revenues, directExpenses, allocatedDirect, allocatedOverhead, consolidated, fairPartners] =
      await Promise.all([
        this.revenuesService.findByFair(fairId),
        this.expensesService.findAllByFair(fairId),
        this.expensesService.findOverheadAllocatedForFair(fairId),
        this.overheadExpensesService.findAllocatedForFair(fairId),
        this.cashFlowService.generateConsolidatedReport(fairId, options),
        this.fairPartnerRepository.find({ where: { fairId, isActive: true } }),
      ]);

    const revenueRows = this.buildRevenueRows(revenues);
    const expenseRows = this.buildExpenseRows(directExpenses, allocatedDirect, allocatedOverhead);

    const despesasDiretas =
      Math.round(directExpenses.reduce((sum, e) => sum + Number(e.valor), 0) * 100) / 100;
    const despesasRateadas =
      Math.round(
        (allocatedDirect.reduce((s, e) => s + e.valorAlocado, 0) +
          allocatedOverhead.reduce((s, e) => s + e.valorAlocado, 0)) *
          100,
      ) / 100;

    // Quando o RBT12 não pode ser estimado (nenhuma receita cadastrada no ano),
    // o sistema não calcula imposto e netBalanceAfterTaxes fica null — nesse
    // caso usamos o saldo pré-imposto (netBalance) como lucro líquido, e a
    // seção de impostos do PDF já mostra "dado não disponível" para deixar
    // claro que não houve cálculo tributário.
    const lucroLiquido = consolidated.netBalanceAfterTaxes ?? consolidated.netBalance;

    const partnerIds = fairPartners.map((fp) => fp.partnerId);
    const partners = partnerIds.length
      ? await this.partnerRepository.find({ where: { id: In(partnerIds) } })
      : [];
    const socios: SocioRow[] = fairPartners.map((fp) => {
      const partner = partners.find((p) => p.id === fp.partnerId);
      return {
        nome: partner?.name ?? 'dado não disponível',
        percentual: fp.percentage,
        valor: Math.round(lucroLiquido * (fp.percentage / 100) * 100) / 100,
      };
    });

    return {
      generatedAt: new Date(),
      fair,
      revenueRows,
      expenseRows,
      totals: {
        receitaBrutaTributavel: consolidated.totalRevenue,
        receitaPermuta: consolidated.permutaRevenue,
        despesasDiretas,
        despesasRateadas,
        despesasTotal: consolidated.totalExpenses,
        imposto: {
          cnae: consolidated.taxes.cnae,
          anexo: consolidated.taxes.annex,
          rbt12: consolidated.taxes.rbt12,
          rbt12Completo: consolidated.taxes.rbt12Complete,
          faixa: consolidated.taxes.bracket,
          aliquotaNominal: consolidated.taxes.nominalRate,
          parcelaDeduzir: consolidated.taxes.deduction,
          aliquotaEfetiva: consolidated.taxes.effectiveRate,
          valor: consolidated.taxes.amount,
          mensagemSistema: consolidated.taxes.message,
        },
        lucroLiquido,
        profitMargin: consolidated.profitMargin,
      },
      socios,
    };
  }

  private buildRevenueRows(revenues: Revenue[]): RevenueRow[] {
    return revenues
      .map((r) => ({
        data: r.createdAt,
        clienteOrigem: r.client?.name ?? 'dado não disponível',
        canalAquisicao: `${r.type}${r.entryModel?.name ? ' — ' + r.entryModel.name : ''}`,
        formaPagamento: r.paymentMethod,
        parcelas: r.numberOfInstallments,
        status: r.status,
        valor: Number(r.contractValue) / 100,
        isPermuta: /permuta/i.test(r.notes ?? ''),
        isCancelado: r.status === 'CANCELADO',
      }))
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }

  private buildExpenseRows(
    directExpenses: Awaited<ReturnType<ExpensesService['findAllByFair']>>,
    allocatedDirect: Awaited<ReturnType<ExpensesService['findOverheadAllocatedForFair']>>,
    allocatedOverhead: Awaited<ReturnType<OverheadExpensesService['findAllocatedForFair']>>,
  ): ExpenseRow[] {
    const rows: ExpenseRow[] = [];

    for (const e of directExpenses) {
      rows.push({
        data: e.data,
        descricao: e.descricao ?? 'dado não disponível',
        fornecedor: fornecedorFromDescricao(e.descricao),
        categoria: e.category?.nome ?? 'dado não disponível',
        valor: Number(e.valor),
        grupo: 'direta',
        detalheRateio: null,
      });
    }

    for (const e of allocatedDirect) {
      const detalhe = e.feirasRateadas
        .map((f) => `${f.fairName} ${(f.percentual * 100).toFixed(0)}%`)
        .join(' / ');
      rows.push({
        data: e.data,
        descricao: e.descricao ?? 'dado não disponível',
        fornecedor: 'dado não disponível (custo rateado entre feiras)',
        categoria: e.category?.name ?? 'dado não disponível',
        valor: e.valorAlocado,
        grupo: 'rateada',
        detalheRateio: `Total R$ ${e.valorTotal.toFixed(2)} rateado entre: ${detalhe}`,
      });
    }

    for (const e of allocatedOverhead) {
      const detalhe = e.feirasRateadas
        .map((f) => `${f.fairName} ${(f.percentual * 100).toFixed(0)}%`)
        .join(' / ');
      rows.push({
        data: e.data,
        descricao: e.descricao ?? 'dado não disponível',
        fornecedor: 'dado não disponível (custo rateado entre feiras)',
        categoria: e.category?.nome ?? 'dado não disponível',
        valor: e.valorAlocado,
        grupo: 'rateada',
        detalheRateio: `Total R$ ${e.valorTotal.toFixed(2)} rateado entre: ${detalhe}`,
      });
    }

    return rows.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }

  async generatePdf(fairId: string, options: { rbt12?: number; annex?: TaxAnnex } = {}): Promise<Buffer> {
    const data = await this.buildReportData(fairId, options);
    const html = this.renderHtml(data);

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate:
          '<div style="font-size:8px; width:100%; text-align:center; color:#888;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>',
        margin: { top: '18mm', bottom: '14mm', left: '14mm', right: '14mm' },
      });
      await browser.close();
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(`Erro ao gerar PDF de auditoria da feira ${fairId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erro ao gerar PDF de auditoria');
    }
  }

  private renderHtml(data: AuditReportData): string {
    const brl = (n: number | null) =>
      n === null ? 'dado não disponível' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const pct = (n: number | null) => (n === null ? 'dado não disponível' : `${n.toFixed(2)}%`);
    const dataBr = (d: Date | string | null) =>
      d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'dado não disponível';
    const dataHoraBr = (d: Date) => d.toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });
    const statusLabel = (status: string) =>
      ({
        PAGO: 'Pago',
        EM_ATRASO: 'Em atraso',
        PENDENTE: 'Pendente',
        EM_ANDAMENTO: 'Em andamento',
        CANCELADO: 'Cancelado',
      })[status] ?? status;

    const { fair, totals } = data;

    const revenueRowsHtml = data.revenueRows
      .map(
        (r) => `
      <tr class="${r.isCancelado ? 'row-excluded' : ''}">
        <td>${dataBr(r.data)}</td>
        <td>${r.clienteOrigem}${r.isPermuta ? ' <span class="tag">permuta</span>' : ''}</td>
        <td>${r.canalAquisicao}</td>
        <td>${r.formaPagamento}${r.parcelas > 1 ? ` (${r.parcelas}x)` : ''}</td>
        <td>${statusLabel(r.status)}</td>
        <td class="num">${brl(r.valor)}${r.isCancelado ? ' <span class="tag">excluído do subtotal</span>' : ''}</td>
      </tr>`,
      )
      .join('');

    const expenseRowsHtml = (grupo: 'direta' | 'rateada') =>
      data.expenseRows
        .filter((r) => r.grupo === grupo)
        .map((r) => {
          const missing = r.fornecedor.startsWith('dado não disponível') || r.categoria === 'dado não disponível';
          return `
      <tr class="${missing ? 'row-missing' : ''}">
        <td>${dataBr(r.data)}</td>
        <td>${r.descricao}</td>
        <td>${r.fornecedor}</td>
        <td>${r.categoria}</td>
        <td class="num">${brl(r.valor)}</td>
      </tr>${r.detalheRateio ? `<tr class="detail-row"><td></td><td colspan="4">${r.detalheRateio}</td></tr>` : ''}`;
        })
        .join('');

    const sociosHtml = data.socios.length
      ? data.socios
          .map((s) => `<tr><td>${s.nome}</td><td>${s.percentual.toFixed(2)}%</td><td class="num">${brl(s.valor)}</td></tr>`)
          .join('')
      : '<tr><td colspan="3">Nenhum sócio ativo cadastrado para esta feira</td></tr>';

    return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Auditoria Financeira — ${fair.name}</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 11px; line-height: 1.4; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 24px 0 8px; border-bottom: 2px solid #1a1a1a; padding-bottom: 4px; }
  h3 { font-size: 13px; margin: 16px 0 6px; color: #333; }
  .top-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #999; padding-bottom: 8px; margin-bottom: 16px; }
  .top-header .meta { font-size: 10px; color: #555; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  table.data th, table.data td { border: 1px solid #ccc; padding: 4px 6px; font-size: 9.5px; text-align: left; }
  table.data th { background: #f0f0f0; }
  table.data tbody tr:nth-child(even) { background: #fafafa; }
  tr.row-missing { background: #fff6e0 !important; }
  tr.row-excluded { background: #f5f5f5 !important; color: #888; text-decoration: line-through; }
  tr.detail-row td { border-top: none; font-size: 8.5px; color: #666; font-style: italic; background: #fcfcfc; }
  .num { text-align: right; white-space: nowrap; }
  .tag { display: inline-block; font-size: 8px; padding: 1px 5px; border-radius: 3px; background: #ddd; color: #333; margin-left: 4px; }
  table.header-table th { text-align: left; color: #555; width: 12%; padding: 3px 6px; font-weight: 600; }
  table.header-table td { padding: 3px 6px; width: 38%; }
  table.subtotal td { padding: 5px 6px; font-weight: 600; border-top: 2px solid #1a1a1a; }
  table.tax-table th { text-align: left; background: #f0f0f0; padding: 4px 6px; width: 22%; }
  table.tax-table td { padding: 4px 6px; width: 28%; border: 1px solid #ddd; }
  table.formula td { padding: 5px 8px; border-bottom: 1px solid #eee; }
  table.formula tr.total td { border-top: 2px solid #1a1a1a; border-bottom: none; font-weight: 700; font-size: 13px; }
  .strong { font-weight: 700; }
  p.note { font-size: 9px; color: #666; margin: 4px 0 10px; }
  p.note.warn { color: #8a5a00; }
</style>
</head>
<body>
  <div class="top-header">
    <div>
      <h1>Auditoria Financeira Detalhada</h1>
      <div>${fair.name}${fair.edition ? ` — ${fair.edition}ª edição` : ''} · Oficina d'Ideias — CNPJ 29.615.037/0001-06</div>
    </div>
    <div class="meta">
      Relatório gerado em ${dataHoraBr(data.generatedAt)}<br/>
      Dados extraídos diretamente do sistema de gestão (credenciamento-api)
    </div>
  </div>

  <table class="header-table">
    <tr><th>Cidade</th><td>${fair.city ?? 'dado não disponível'}${fair.state ? ' / ' + fair.state : ''}</td>
        <th>Local</th><td>${fair.venueName ?? 'dado não disponível'}</td></tr>
    <tr><th>Datas</th><td>${dataBr(fair.startDate)} a ${dataBr(fair.endDate)}</td>
        <th>Status no sistema</th><td>${fair.status}</td></tr>
  </table>

  <h2>1. Receitas</h2>
  <table class="data">
    <thead><tr><th>Data de registro</th><th>Cliente / Origem</th><th>Canal (tipo — modelo)</th><th>Forma pgto.</th><th>Status</th><th class="num">Valor</th></tr></thead>
    <tbody>${revenueRowsHtml || '<tr><td colspan="6">Nenhuma receita registrada para esta feira</td></tr>'}</tbody>
  </table>
  <table class="subtotal">
    <tr><td>Subtotal — Receita bruta (base tributável, exclui cancelados${totals.receitaPermuta > 0 ? ' e permutas' : ''})</td><td class="num">${brl(totals.receitaBrutaTributavel)}</td></tr>
    ${totals.receitaPermuta > 0 ? `<tr><td>Receita em permuta (não integra a base tributável)</td><td class="num">${brl(totals.receitaPermuta)}</td></tr>` : ''}
  </table>
  <p class="note">A receita não possui campo próprio de "data da venda" no sistema; "Data de registro" reflete o campo <code>createdAt</code> de cada lançamento.</p>

  <h2>2. Despesas diretas</h2>
  <table class="data">
    <thead><tr><th>Data</th><th>Descrição</th><th>Fornecedor</th><th>Categoria</th><th class="num">Valor</th></tr></thead>
    <tbody>${expenseRowsHtml('direta') || '<tr><td colspan="5">Nenhuma despesa direta registrada para esta feira</td></tr>'}</tbody>
  </table>
  <table class="subtotal"><tr><td>Subtotal — Despesas diretas</td><td class="num">${brl(totals.despesasDiretas)}</td></tr></table>

  ${
    data.expenseRows.some((r) => r.grupo === 'rateada')
      ? `
  <h2>3. Despesas rateadas / compartilhadas com outras feiras</h2>
  <table class="data">
    <thead><tr><th>Data</th><th>Descrição</th><th>Fornecedor</th><th>Categoria</th><th class="num">Valor alocado nesta feira</th></tr></thead>
    <tbody>${expenseRowsHtml('rateada')}</tbody>
  </table>
  <table class="subtotal"><tr><td>Subtotal — Despesas rateadas nesta feira</td><td class="num">${brl(totals.despesasRateadas)}</td></tr></table>`
      : ''
  }
  <p class="note">Linhas destacadas indicam campo(s) sem dado estruturado disponível no sistema ("dado não disponível") — nenhum valor foi estimado ou presumido.</p>

  <h2>4. Impostos</h2>
  <table class="tax-table">
    <tr><th>CNAE</th><td>${totals.imposto.cnae}</td><th>Anexo (Simples Nacional)</th><td>${totals.imposto.anexo}</td></tr>
    <tr><th>RBT12 considerado</th><td>${brl(totals.imposto.rbt12)}</td><th>Faixa</th><td>${totals.imposto.faixa ?? 'dado não disponível'}</td></tr>
    <tr><th>Alíquota nominal</th><td>${pct(totals.imposto.aliquotaNominal)}</td><th>Parcela a deduzir</th><td>${brl(totals.imposto.parcelaDeduzir)}</td></tr>
    <tr><th>Alíquota efetiva</th><td>${pct(totals.imposto.aliquotaEfetiva)}</td><th>Imposto calculado</th><td class="num strong">${brl(totals.imposto.valor)}</td></tr>
  </table>
  ${totals.imposto.mensagemSistema ? `<p class="note warn">⚠ ${totals.imposto.mensagemSistema}</p>` : ''}
  <p class="note">Método: cálculo já existente no sistema (Simples Nacional, tabela do Anexo ${totals.imposto.anexo}), aplicado sobre o RBT12 estimado a partir da soma de receitas de todas as feiras do mesmo ano cadastradas (proxy do faturamento dos 12 meses anteriores da Oficina d'Ideias — CNPJ 29.615.037/0001-06). Imposto da feira = Receita bruta tributável da feira × alíquota efetiva.</p>

  <h2>5. Lucro líquido da feira</h2>
  <table class="formula">
    <tr><td>Receita bruta</td><td class="num">${brl(totals.receitaBrutaTributavel)}</td></tr>
    <tr><td>(−) Despesas diretas</td><td class="num">${brl(totals.despesasDiretas)}</td></tr>
    ${totals.despesasRateadas > 0 ? `<tr><td>(−) Despesas rateadas (ver seção 3)</td><td class="num">${brl(totals.despesasRateadas)}</td></tr>` : ''}
    <tr><td>(−) Impostos</td><td class="num">${brl(totals.imposto.valor)}</td></tr>
    <tr class="total"><td>Lucro líquido</td><td class="num">${brl(totals.lucroLiquido)}</td></tr>
    <tr><td>Margem de lucro</td><td class="num">${pct(totals.profitMargin)}</td></tr>
  </table>

  <h2>6. Divisão do lucro líquido entre sócios</h2>
  <table class="data">
    <thead><tr><th>Sócio</th><th>Participação nesta feira</th><th class="num">Valor</th></tr></thead>
    <tbody>${sociosHtml}</tbody>
  </table>
  <p class="note">Percentuais obtidos do cadastro de sócios por feira do sistema (fair_partners), não de um valor fixo. O imposto usado no cálculo é uma estimativa — ver aviso na seção 4.</p>
</body>
</html>`;
  }
}
