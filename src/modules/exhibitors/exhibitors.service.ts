import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Client } from '../finance/clients/entities/client.entity';
import { Fair } from '../fairs/entity/fair.entity';
import { User } from '../users/entitie/users.entity';
import {
  CreateExhibitorDto,
  CreateExhibitorFairDto,
  CreateExhibitorInvitationDto,
  CreateExhibitorMemberDto,
} from './exhibitors.dto';
import {
  ExhibitorFair,
  ExhibitorFairStatus,
} from './entities/exhibitor-fair.entity';
import {
  ExhibitorCredentialStatus,
  ExhibitorFairMember,
} from './entities/exhibitor-fair-member.entity';
import { ExhibitorFinanceClient } from './entities/exhibitor-finance-client.entity';
import {
  ExhibitorInvitation,
  ExhibitorInvitationStatus,
} from './entities/exhibitor-invitation.entity';
import {
  ExhibitorMember,
  ExhibitorMemberRole,
} from './entities/exhibitor-member.entity';
import { Exhibitor, ExhibitorType } from './entities/exhibitor.entity';

@Injectable()
export class ExhibitorsService {
  constructor(
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Fair) private readonly fairs: Repository<Fair>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Exhibitor)
    private readonly exhibitors: Repository<Exhibitor>,
    @InjectRepository(ExhibitorFinanceClient)
    private readonly financeClientLinks: Repository<ExhibitorFinanceClient>,
    @InjectRepository(ExhibitorMember)
    private readonly members: Repository<ExhibitorMember>,
    @InjectRepository(ExhibitorFair)
    private readonly exhibitorFairs: Repository<ExhibitorFair>,
    @InjectRepository(ExhibitorFairMember)
    private readonly fairMembers: Repository<ExhibitorFairMember>,
    @InjectRepository(ExhibitorInvitation)
    private readonly invitations: Repository<ExhibitorInvitation>,
  ) {}

  static normalizeName(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  async assertExhibitor(exhibitorId: string): Promise<Exhibitor> {
    const exhibitor = await this.exhibitors.findOne({
      where: { id: exhibitorId },
    });
    if (!exhibitor) throw new NotFoundException('Expositor não encontrado');
    return exhibitor;
  }

  async listExhibitors() {
    const rows = await this.exhibitors.manager.query(
      `SELECT e.id,
              e.name,
              e.normalizedName,
              e.type,
              e.cnpj,
              e.isActive,
              e.createdAt,
              e.updatedAt,
              ((SELECT COUNT(DISTINCT ef.fairId)
                  FROM exhibitor_fairs ef
                 WHERE ef.exhibitorId = e.id
                   AND ef.status <> 'CANCELLED')
               + (SELECT COUNT(DISTINCT r.fairId)
                    FROM exhibitor_finance_clients efc
                    JOIN finance_revenues r ON r.clientId = efc.clientId
                   WHERE efc.exhibitorId = e.id
                     AND r.type = 'STAND'
                     AND r.status <> 'CANCELADO')
               - (SELECT COUNT(DISTINCT ef.fairId)
                    FROM exhibitor_fairs ef
                    JOIN exhibitor_finance_clients efc
                      ON efc.exhibitorId = ef.exhibitorId
                    JOIN finance_revenues r
                      ON r.clientId = efc.clientId AND r.fairId = ef.fairId
                   WHERE ef.exhibitorId = e.id
                     AND ef.status <> 'CANCELLED'
                     AND r.type = 'STAND'
                     AND r.status <> 'CANCELADO')) AS fairCount,
              (SELECT COUNT(*)
                 FROM exhibitor_members em
                WHERE em.exhibitorId = e.id
                  AND em.isActive = 1) AS peopleCount,
              (SELECT COUNT(*)
                 FROM exhibitor_finance_clients efc
                WHERE efc.exhibitorId = e.id) AS financeClientCount,
              (SELECT COUNT(DISTINCT r.id)
                 FROM exhibitor_finance_clients efc
                 JOIN finance_revenues r ON r.clientId = efc.clientId
                WHERE efc.exhibitorId = e.id
                  AND r.type = 'STAND'
                  AND r.status <> 'CANCELADO') AS standCount,
              (SELECT COALESCE(SUM(r.contractValue), 0)
                 FROM exhibitor_finance_clients efc
                 JOIN finance_revenues r ON r.clientId = efc.clientId
                WHERE efc.exhibitorId = e.id
                  AND r.type = 'STAND'
                  AND r.status <> 'CANCELADO') AS totalStandRevenueCents,
              (SELECT MAX(r.createdAt)
                 FROM exhibitor_finance_clients efc
                 JOIN finance_revenues r ON r.clientId = efc.clientId
                WHERE efc.exhibitorId = e.id
                  AND r.type = 'STAND'
                  AND r.status <> 'CANCELADO') AS lastStandPurchaseAt
         FROM exhibitors e
        ORDER BY e.name ASC`,
    );
    return rows.map((row: any) => ({
      ...row,
      isActive: Boolean(row.isActive),
      fairCount: Number(row.fairCount),
      standCount: Number(row.standCount),
      peopleCount: Number(row.peopleCount),
      financeClientCount: Number(row.financeClientCount),
      totalStandRevenueCents: Number(row.totalStandRevenueCents),
      lastStandPurchaseAt: row.lastStandPurchaseAt ?? null,
    }));
  }

  async getCompleteDetails(exhibitorId: string) {
    const exhibitor = await this.exhibitors.findOne({
      where: { id: exhibitorId },
      relations: ['financeClients', 'financeClients.client'],
    });
    if (!exhibitor) throw new NotFoundException('Expositor não encontrado');

    const [
      team,
      participations,
      statistics,
      invitations,
      financialIndicatorsRows,
      yearlyEvolutionRows,
      totalActiveFairs,
    ] = await Promise.all([
      this.members.find({
        where: { exhibitorId },
        order: { name: 'ASC' },
      }),
      this.exhibitorFairs.find({
        where: { exhibitorId },
        relations: ['fair', 'members', 'members.member'],
        order: { createdAt: 'DESC' },
      }),
      this.getStatistics(exhibitorId),
      this.invitations.find({
        where: { exhibitorId },
        order: { createdAt: 'DESC' },
      }),
      this.getFinancialIndicators(exhibitorId),
      this.getYearlyEvolution(exhibitorId),
      this.fairs.count(),
    ]);

    const activeParticipations = participations.filter(
      (participation) => participation.status !== ExhibitorFairStatus.CANCELLED,
    );
    const activeTeam = team.filter((member) => member.isActive);
    const fairIds = new Set([
      ...activeParticipations.map((participation) => participation.fairId),
      ...statistics.fairs.map((fair) => fair.fairId),
    ]);
    const financialIndicators = this.mapFinancialIndicators(
      financialIndicatorsRows[0],
    );
    const primaryTeamContact =
      activeTeam
        .slice()
        .sort(
          (a, b) =>
            this.contactRolePriority(a.role) -
            this.contactRolePriority(b.role),
        )
        .find((member) => member.email || member.phone) ?? null;
    const financeContact = exhibitor.financeClients
      .map((link) => link.client)
      .find((client) => client?.email || client?.phone || client?.responsavel);
    const primaryContact = primaryTeamContact
      ? {
          source: 'TEAM',
          id: primaryTeamContact.id,
          name: primaryTeamContact.name,
          role: primaryTeamContact.role,
          jobTitle: primaryTeamContact.jobTitle ?? null,
          email: primaryTeamContact.email ?? null,
          phone: primaryTeamContact.phone ?? null,
        }
      : financeContact
        ? {
            source: 'FINANCE_CLIENT',
            id: financeContact.id,
            name: financeContact.responsavel || financeContact.name,
            role: null,
            jobTitle: null,
            email: financeContact.email ?? null,
            phone: financeContact.phone ?? null,
          }
        : null;
    const firstActivityAt = this.oldestDate([
      financialIndicators.firstPurchaseAt,
      ...activeParticipations.map((participation) => participation.createdAt),
    ]);
    const lastActivityAt = this.newestDate([
      financialIndicators.lastPurchaseAt,
      ...activeParticipations.map((participation) => participation.updatedAt),
    ]);
    const yearsAsCustomer = firstActivityAt
      ? Number(
          (
            (Date.now() - firstActivityAt.getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
          ).toFixed(1),
        )
      : 0;
    const activeCredentials = participations.reduce(
      (sum, participation) =>
        sum +
        participation.members.filter(
          (credential) =>
            credential.status === ExhibitorCredentialStatus.ACTIVE,
        ).length,
      0,
    );
    return {
      exhibitor: {
        id: exhibitor.id,
        name: exhibitor.name,
        normalizedName: exhibitor.normalizedName,
        type: exhibitor.type,
        cnpj: exhibitor.cnpj ?? null,
        isActive: exhibitor.isActive,
        createdAt: exhibitor.createdAt,
        updatedAt: exhibitor.updatedAt,
      },
      counts: {
        fairs: fairIds.size,
        stands: statistics.totals.totalStandsPurchased,
        people: activeTeam.length,
        financeClients: exhibitor.financeClients.length,
        credentials: participations.reduce(
          (sum, participation) => sum + participation.members.length,
          0,
        ),
        activeCredentials,
      },
      commercial: {
        primaryContact,
        firstParticipationAt: firstActivityAt?.toISOString() ?? null,
        lastParticipationAt: lastActivityAt?.toISOString() ?? null,
        yearsAsCustomer,
        isRecurring: fairIds.size > 1,
        participationRate:
          totalActiveFairs > 0
            ? Number(((fairIds.size / totalActiveFairs) * 100).toFixed(2))
            : 0,
        totalFairsAvailable: totalActiveFairs,
      },
      financial: {
        ...statistics.totals,
        ...financialIndicators,
      },
      fairFinancials: statistics.fairs,
      yearlyEvolution: yearlyEvolutionRows.map((row: any) => ({
        year: Number(row.year),
        fairs: Number(row.fairs),
        stands: Number(row.stands),
        contractedCents: Number(row.contractedCents),
        paidCents: Number(row.paidCents),
      })),
      purchases: statistics.purchases,
      participations,
      team,
      financeClients: exhibitor.financeClients,
      invitations: invitations.map(({ tokenHash: _tokenHash, ...invitation }) =>
        invitation,
      ),
    };
  }

  private getFinancialIndicators(exhibitorId: string) {
    return this.exhibitors.manager.query(
      `SELECT COALESCE(SUM(revenue.contractValue), 0) AS totalContractedCents,
              COALESCE(SUM(revenue.paidCents), 0) AS totalPaidCents,
              COALESCE(SUM(revenue.pendingCents), 0) AS totalPendingCents,
              COALESCE(SUM(revenue.overdueCents), 0) AS totalOverdueCents,
              COALESCE(AVG(CASE WHEN revenue.type = 'STAND' THEN revenue.contractValue END), 0) AS averageStandTicketCents,
              MIN(revenue.createdAt) AS firstPurchaseAt,
              MAX(revenue.createdAt) AS lastPurchaseAt
         FROM (
           SELECT r.id,
                  r.type,
                  r.contractValue,
                  r.createdAt,
                  CASE
                    WHEN r.status = 'PAGO' THEN r.contractValue
                    ELSE COALESCE(SUM(CASE WHEN i.status = 'PAGA' THEN i.valueCents ELSE 0 END), 0)
                  END AS paidCents,
                  CASE
                    WHEN COUNT(i.id) = 0 AND r.status IN ('PENDENTE', 'EM_ANDAMENTO') THEN r.contractValue
                    ELSE COALESCE(SUM(CASE WHEN i.status = 'A_VENCER' THEN i.valueCents ELSE 0 END), 0)
                  END AS pendingCents,
                  CASE
                    WHEN COUNT(i.id) = 0 AND r.status = 'EM_ATRASO' THEN r.contractValue
                    ELSE COALESCE(SUM(CASE WHEN i.status = 'VENCIDA' THEN i.valueCents ELSE 0 END), 0)
                  END AS overdueCents
             FROM exhibitor_finance_clients efc
             JOIN finance_revenues r ON r.clientId = efc.clientId
             LEFT JOIN finance_revenue_installments i ON i.revenueId = r.id
            WHERE efc.exhibitorId = ?
              AND r.status <> 'CANCELADO'
            GROUP BY r.id, r.type, r.contractValue, r.createdAt
         ) revenue`,
      [exhibitorId],
    );
  }

  private getYearlyEvolution(exhibitorId: string) {
    return this.exhibitors.manager.query(
      `SELECT YEAR(revenue.createdAt) AS year,
              COUNT(DISTINCT revenue.fairId) AS fairs,
              COUNT(DISTINCT CASE WHEN revenue.type = 'STAND' THEN revenue.id END) AS stands,
              COALESCE(SUM(revenue.contractValue), 0) AS contractedCents,
              COALESCE(SUM(revenue.paidCents), 0) AS paidCents
         FROM (
           SELECT r.id,
                  r.fairId,
                  r.type,
                  r.contractValue,
                  r.createdAt,
                  CASE
                    WHEN r.status = 'PAGO' THEN r.contractValue
                    ELSE COALESCE(SUM(CASE WHEN i.status = 'PAGA' THEN i.valueCents ELSE 0 END), 0)
                  END AS paidCents
             FROM exhibitor_finance_clients efc
             JOIN finance_revenues r ON r.clientId = efc.clientId
             LEFT JOIN finance_revenue_installments i ON i.revenueId = r.id
            WHERE efc.exhibitorId = ?
              AND r.status <> 'CANCELADO'
            GROUP BY r.id, r.fairId, r.type, r.contractValue, r.createdAt
         ) revenue
        GROUP BY YEAR(revenue.createdAt)
        ORDER BY year DESC`,
      [exhibitorId],
    );
  }

  private mapFinancialIndicators(row: any) {
    const totalPaidCents = Number(row?.totalPaidCents ?? 0);
    const totalPendingCents = Number(row?.totalPendingCents ?? 0);
    const totalOverdueCents = Number(row?.totalOverdueCents ?? 0);
    return {
      totalContractedCents: Number(row?.totalContractedCents ?? 0),
      totalPaidCents,
      totalPendingCents,
      totalOverdueCents,
      availableToPayCents: totalPendingCents + totalOverdueCents,
      averageStandTicketCents: Math.round(
        Number(row?.averageStandTicketCents ?? 0),
      ),
      financialStatus:
        totalOverdueCents > 0
          ? 'INADIMPLENTE'
          : totalPendingCents > 0
            ? 'PENDENTE'
            : 'ADIMPLENTE',
      firstPurchaseAt: row?.firstPurchaseAt ?? null,
      lastPurchaseAt: row?.lastPurchaseAt ?? null,
    };
  }

  private contactRolePriority(role: ExhibitorMemberRole): number {
    const priorities: Record<ExhibitorMemberRole, number> = {
      [ExhibitorMemberRole.OWNER]: 0,
      [ExhibitorMemberRole.ADMIN]: 1,
      [ExhibitorMemberRole.MANAGER]: 2,
      [ExhibitorMemberRole.FINANCE]: 3,
      [ExhibitorMemberRole.STAFF]: 4,
    };
    return priorities[role];
  }

  private oldestDate(values: Array<Date | string | null | undefined>) {
    const dates = values.filter(Boolean).map((value) => new Date(value!));
    return dates.length
      ? new Date(Math.min(...dates.map((date) => date.getTime())))
      : null;
  }

  private newestDate(values: Array<Date | string | null | undefined>) {
    const dates = values.filter(Boolean).map((value) => new Date(value!));
    return dates.length
      ? new Date(Math.max(...dates.map((date) => date.getTime())))
      : null;
  }

  async createExhibitor(dto: CreateExhibitorDto) {
    const normalizedName = ExhibitorsService.normalizeName(dto.name);
    const existing = await this.exhibitors.findOne({
      where: { normalizedName },
    });
    if (existing) return existing;
    return this.exhibitors.save(
      this.exhibitors.create({
        name: dto.name.trim(),
        normalizedName,
        type: dto.type ?? ExhibitorType.OTHER,
        cnpj: dto.cnpj?.replace(/\D/g, '') || null,
      }),
    );
  }

  async listStatistics(fairId?: string) {
    if (fairId) await this.assertFair(fairId);
    const rows = await this.getStatisticsRows(undefined, fairId);
    const exhibitors = rows.map((row) => this.mapStatisticsRow(row));
    return {
      fairId: fairId ?? null,
      summary: {
        totalExhibitors: exhibitors.length,
        exhibitorsWithStandPurchases: exhibitors.filter(
          (item) => item.totalStandsPurchased > 0,
        ).length,
        totalStandsPurchased: exhibitors.reduce(
          (sum, item) => sum + item.totalStandsPurchased,
          0,
        ),
        totalStandRevenueCents: exhibitors.reduce(
          (sum, item) => sum + item.totalStandRevenueCents,
          0,
        ),
        totalSponsorships: exhibitors.reduce(
          (sum, item) => sum + item.totalSponsorships,
          0,
        ),
        totalSponsorshipRevenueCents: exhibitors.reduce(
          (sum, item) => sum + item.totalSponsorshipRevenueCents,
          0,
        ),
      },
      exhibitors,
    };
  }

  async getStatistics(exhibitorId: string, fairId?: string) {
    const exhibitor = await this.assertExhibitor(exhibitorId);
    if (fairId) await this.assertFair(fairId);
    const rows = await this.getStatisticsRows(exhibitorId, fairId);
    const totals = this.mapStatisticsRow(rows[0]);
    const fairFilter = fairId ? ' AND r.fairId = ?' : '';
    const params = fairId ? [exhibitorId, fairId] : [exhibitorId];
    const fairs = await this.exhibitors.manager.query(
      `SELECT r.fairId,
              f.name AS fairName,
              COUNT(DISTINCT CASE WHEN r.type = 'STAND' AND r.status <> 'CANCELADO' THEN r.id END) AS standsPurchased,
              COUNT(DISTINCT CASE WHEN r.type = 'STAND' AND r.status <> 'CANCELADO' AND s.id IS NOT NULL THEN s.id END) AS mappedStands,
              COALESCE(SUM(CASE WHEN r.type = 'STAND' AND r.status <> 'CANCELADO' THEN r.contractValue ELSE 0 END), 0) AS standRevenueCents,
              COALESCE(SUM(CASE WHEN r.type = 'PATROCINIO' AND r.status <> 'CANCELADO' THEN r.contractValue ELSE 0 END), 0) AS sponsorshipRevenueCents,
              MAX(CASE WHEN r.type = 'STAND' AND r.status <> 'CANCELADO' THEN r.createdAt END) AS lastStandPurchaseAt
         FROM exhibitor_finance_clients efc
         JOIN finance_revenues r ON r.clientId = efc.clientId${fairFilter}
         JOIN fairs f ON f.id = r.fairId
         LEFT JOIN stands s ON s.revenue_id = r.id
        WHERE efc.exhibitorId = ?
        GROUP BY r.fairId, f.name
        ORDER BY MAX(r.createdAt) DESC`,
      fairId ? [fairId, exhibitorId] : [exhibitorId],
    );
    const purchases = await this.exhibitors.manager.query(
      `SELECT r.id AS revenueId,
              r.fairId,
              f.name AS fairName,
              r.clientId,
              c.name AS clientName,
              r.status,
              r.contractValue AS contractValueCents,
              r.paymentMethod,
              r.numberOfInstallments,
              r.createdAt,
              s.id AS standId,
              s.stand_number AS standNumber
         FROM exhibitor_finance_clients efc
         JOIN finance_revenues r ON r.clientId = efc.clientId
         JOIN finance_clients c ON c.id = r.clientId
         JOIN fairs f ON f.id = r.fairId
         LEFT JOIN stands s ON s.revenue_id = r.id
        WHERE efc.exhibitorId = ?
          AND r.type = 'STAND'${fairFilter}
        ORDER BY r.createdAt DESC`,
      params,
    );
    return {
      exhibitor: {
        id: exhibitor.id,
        name: exhibitor.name,
        type: exhibitor.type,
        cnpj: exhibitor.cnpj ?? null,
      },
      fairId: fairId ?? null,
      totals,
      fairs: fairs.map((row: any) => ({
        fairId: row.fairId,
        fairName: row.fairName,
        standsPurchased: Number(row.standsPurchased),
        mappedStands: Number(row.mappedStands),
        standRevenueCents: Number(row.standRevenueCents),
        sponsorshipRevenueCents: Number(row.sponsorshipRevenueCents),
        lastStandPurchaseAt: row.lastStandPurchaseAt ?? null,
      })),
      purchases: purchases.map((row: any) => ({
        ...row,
        contractValueCents: Number(row.contractValueCents),
        numberOfInstallments: Number(row.numberOfInstallments),
        standId: row.standId == null ? null : Number(row.standId),
        standNumber: row.standNumber == null ? null : Number(row.standNumber),
      })),
    };
  }

  private async assertFair(fairId: string): Promise<void> {
    const fair = await this.fairs.findOne({ where: { id: fairId } });
    if (!fair) throw new NotFoundException('Feira não encontrada');
  }

  private getStatisticsRows(exhibitorId?: string, fairId?: string) {
    const revenueFilter = fairId ? ' AND r.fairId = ?' : '';
    const exhibitorFilter = exhibitorId ? ' WHERE e.id = ?' : '';
    const params = [
      ...(fairId ? [fairId] : []),
      ...(exhibitorId ? [exhibitorId] : []),
    ];
    return this.exhibitors.manager.query(
      `SELECT e.id AS exhibitorId,
              e.name AS exhibitorName,
              e.type AS exhibitorType,
              e.cnpj,
              COUNT(DISTINCT efc.clientId) AS financeClientCount,
              COUNT(DISTINCT CASE WHEN r.type = 'STAND' AND r.status <> 'CANCELADO' THEN r.id END) AS totalStandsPurchased,
              COUNT(DISTINCT CASE WHEN r.type = 'STAND' AND r.status <> 'CANCELADO' AND s.id IS NOT NULL THEN s.id END) AS mappedStands,
              COALESCE(SUM(CASE WHEN r.type = 'STAND' AND r.status <> 'CANCELADO' THEN r.contractValue ELSE 0 END), 0) AS totalStandRevenueCents,
              COUNT(DISTINCT CASE WHEN r.type = 'PATROCINIO' AND r.status <> 'CANCELADO' THEN r.id END) AS totalSponsorships,
              COALESCE(SUM(CASE WHEN r.type = 'PATROCINIO' AND r.status <> 'CANCELADO' THEN r.contractValue ELSE 0 END), 0) AS totalSponsorshipRevenueCents,
              COUNT(DISTINCT CASE WHEN r.type = 'STAND' AND r.status = 'PAGO' THEN r.id END) AS paidStandPurchases,
              COUNT(DISTINCT CASE WHEN r.type = 'STAND' AND r.status = 'PENDENTE' THEN r.id END) AS pendingStandPurchases,
              COUNT(DISTINCT CASE WHEN r.type = 'STAND' AND r.status = 'EM_ANDAMENTO' THEN r.id END) AS inProgressStandPurchases,
              COUNT(DISTINCT CASE WHEN r.type = 'STAND' AND r.status = 'EM_ATRASO' THEN r.id END) AS overdueStandPurchases,
              COUNT(DISTINCT CASE WHEN r.type = 'STAND' AND r.status = 'CANCELADO' THEN r.id END) AS cancelledStandPurchases,
              COUNT(DISTINCT CASE WHEN r.type = 'STAND' AND r.status <> 'CANCELADO' THEN r.fairId END) AS fairsWithStandPurchases,
              MAX(CASE WHEN r.type = 'STAND' AND r.status <> 'CANCELADO' THEN r.createdAt END) AS lastStandPurchaseAt
         FROM exhibitors e
         LEFT JOIN exhibitor_finance_clients efc ON efc.exhibitorId = e.id
         LEFT JOIN finance_revenues r ON r.clientId = efc.clientId${revenueFilter}
         LEFT JOIN stands s ON s.revenue_id = r.id${exhibitorFilter}
        GROUP BY e.id, e.name, e.type, e.cnpj
        ORDER BY totalStandsPurchased DESC, e.name ASC`,
      params,
    );
  }

  private mapStatisticsRow(row: any) {
    return {
      exhibitorId: row.exhibitorId,
      exhibitorName: row.exhibitorName,
      exhibitorType: row.exhibitorType,
      cnpj: row.cnpj ?? null,
      financeClientCount: Number(row.financeClientCount),
      totalStandsPurchased: Number(row.totalStandsPurchased),
      mappedStands: Number(row.mappedStands),
      totalStandRevenueCents: Number(row.totalStandRevenueCents),
      totalSponsorships: Number(row.totalSponsorships),
      totalSponsorshipRevenueCents: Number(row.totalSponsorshipRevenueCents),
      fairsWithStandPurchases: Number(row.fairsWithStandPurchases),
      status: {
        paid: Number(row.paidStandPurchases),
        pending: Number(row.pendingStandPurchases),
        inProgress: Number(row.inProgressStandPurchases),
        overdue: Number(row.overdueStandPurchases),
        cancelled: Number(row.cancelledStandPurchases),
      },
      lastStandPurchaseAt: row.lastStandPurchaseAt ?? null,
    };
  }

  async linkFinanceClient(exhibitorId: string, clientId: string) {
    await this.assertExhibitor(exhibitorId);
    const client = await this.clients.findOne({ where: { id: clientId } });
    if (!client)
      throw new NotFoundException('Cliente financeiro não encontrado');
    const linked = await this.financeClientLinks.findOne({
      where: { clientId },
    });
    if (linked && linked.exhibitorId !== exhibitorId)
      throw new ConflictException(
        'Cliente financeiro já pertence a outro expositor',
      );
    if (linked) return linked;
    return this.financeClientLinks.save(
      this.financeClientLinks.create({ exhibitorId, clientId }),
    );
  }

  listMyOrganizations(userId: number) {
    return this.members.find({
      where: { userId, isActive: true },
      relations: ['exhibitor'],
      order: { createdAt: 'ASC' },
    });
  }

  async listTeam(exhibitorId: string) {
    await this.assertExhibitor(exhibitorId);
    return this.members.find({
      where: { exhibitorId },
      order: { name: 'ASC' },
    });
  }

  async createMember(exhibitorId: string, dto: CreateExhibitorMemberDto) {
    await this.assertExhibitor(exhibitorId);
    const normalizedName = ExhibitorsService.normalizeName(dto.name);
    const existing = await this.members.findOne({
      where: { exhibitorId, normalizedName },
    });
    if (existing) return existing;
    return this.members.save(
      this.members.create({
        ...dto,
        exhibitorId,
        name: dto.name.trim(),
        normalizedName,
        email: dto.email?.trim().toLowerCase() || null,
        phone: dto.phone?.trim() || null,
        jobTitle: dto.jobTitle?.trim() || null,
        role: dto.role ?? ExhibitorMemberRole.STAFF,
      }),
    );
  }

  async listParticipations(exhibitorId: string) {
    await this.assertExhibitor(exhibitorId);
    return this.exhibitorFairs.find({
      where: { exhibitorId },
      relations: ['fair', 'members', 'members.member'],
      order: { createdAt: 'DESC' },
    });
  }

  async createParticipation(exhibitorId: string, dto: CreateExhibitorFairDto) {
    await this.assertExhibitor(exhibitorId);
    const fair = await this.fairs.findOne({ where: { id: dto.fairId } });
    if (!fair) throw new NotFoundException('Feira não encontrada');
    const existing = await this.exhibitorFairs.findOne({
      where: { exhibitorId, fairId: dto.fairId },
    });
    if (existing) return existing;
    return this.exhibitorFairs.save(
      this.exhibitorFairs.create({
        exhibitorId,
        fairId: dto.fairId,
        status: dto.status ?? ExhibitorFairStatus.CONFIRMED,
        source: dto.source?.trim() || null,
      }),
    );
  }

  async addMemberToFair(exhibitorFairId: string, memberId: string) {
    const [participation, member] = await Promise.all([
      this.exhibitorFairs.findOne({ where: { id: exhibitorFairId } }),
      this.members.findOne({ where: { id: memberId } }),
    ]);
    if (!participation)
      throw new NotFoundException('Participação não encontrada');
    if (!member) throw new NotFoundException('Integrante não encontrado');
    if (participation.exhibitorId !== member.exhibitorId)
      throw new BadRequestException('Integrante pertence a outro expositor');
    const existing = await this.fairMembers.findOne({
      where: { exhibitorFairId, memberId },
    });
    if (existing) return existing;
    return this.fairMembers.save(
      this.fairMembers.create({
        exhibitorFairId,
        memberId,
        credentialCode: randomUUID(),
        status: ExhibitorCredentialStatus.ACTIVE,
      }),
    );
  }

  async invite(
    exhibitorId: string,
    dto: CreateExhibitorInvitationDto,
    invitedBy: number,
  ) {
    await this.assertExhibitor(exhibitorId);
    const email = dto.email.trim().toLowerCase();
    const rawToken = randomBytes(32).toString('hex');
    const invitation = await this.invitations.save(
      this.invitations.create({
        exhibitorId,
        email,
        role: dto.role,
        tokenHash: this.hashToken(rawToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedBy,
      }),
    );
    return { ...invitation, tokenHash: undefined, token: rawToken };
  }

  async acceptInvitation(rawToken: string, userId: number) {
    const invitation = await this.invitations.findOne({
      where: { tokenHash: this.hashToken(rawToken) },
    });
    if (!invitation) throw new NotFoundException('Convite não encontrado');
    if (invitation.status !== ExhibitorInvitationStatus.PENDING)
      throw new ConflictException('Convite já processado');
    if (invitation.expiresAt.getTime() <= Date.now()) {
      invitation.status = ExhibitorInvitationStatus.EXPIRED;
      await this.invitations.save(invitation);
      throw new BadRequestException('Convite expirado');
    }
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || user.email.toLowerCase() !== invitation.email)
      throw new BadRequestException('O convite pertence a outro e-mail');
    let member = await this.members.findOne({
      where: { exhibitorId: invitation.exhibitorId, email: invitation.email },
    });
    if (!member)
      member = await this.createMember(invitation.exhibitorId, {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: invitation.role,
      });
    member.userId = userId;
    member.role = invitation.role;
    await this.members.save(member);
    invitation.status = ExhibitorInvitationStatus.ACCEPTED;
    await this.invitations.save(invitation);
    return member;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
