import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, ILike } from 'typeorm';
import {
  Prospect,
  ProspectStatus,
  ProspectType,
  ProspectSource,
} from '../entities/prospect.entity';
import {
  CreateProspectDto,
  ImportCnpjsDto,
  ProspectFiltersDto,
  UpdateProspectDto,
  UpdateStatusDto,
} from '../dto/prospect.dto';
import { CnpjService } from './cnpj.service';
import { CnaeService } from './cnae.service';

@Injectable()
export class ProspectingService {
  private readonly logger = new Logger(ProspectingService.name);

  constructor(
    @InjectRepository(Prospect)
    private readonly repo: Repository<Prospect>,
    private readonly cnpjService: CnpjService,
    private readonly cnaeService: CnaeService,
  ) {}

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async create(fairId: string, dto: CreateProspectDto): Promise<Prospect> {
    const cnpj = dto.cnpj ? this.cnpjService.cleanCnpj(dto.cnpj) : undefined;

    if (cnpj) {
      const exists = await this.repo.findOne({ where: { fairId, cnpj } });
      if (exists) throw new ConflictException(`CNPJ ${cnpj} já cadastrado para esta feira`);
    }

    const prospect = this.repo.create({ ...dto, cnpj, fairId } as Partial<Prospect>);
    return this.repo.save(prospect);
  }

  async findAll(fairId: string, filters: ProspectFiltersDto = {}): Promise<Prospect[]> {
    const where: FindOptionsWhere<Prospect> = { fairId };

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.state) where.state = filters.state;
    if (filters.sector) where.cnaeSector = filters.sector;

    let prospects = await this.repo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    if (filters.search) {
      const s = filters.search.toLowerCase();
      prospects = prospects.filter(
        (p) =>
          p.razaoSocial?.toLowerCase().includes(s) ||
          p.nomeFantasia?.toLowerCase().includes(s) ||
          p.email?.toLowerCase().includes(s) ||
          p.cnpj?.includes(s),
      );
    }

    return prospects;
  }

  async findOne(id: string): Promise<Prospect> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Prospect não encontrado');
    return p;
  }

  async update(id: string, dto: UpdateProspectDto): Promise<Prospect> {
    const p = await this.findOne(id);
    Object.assign(p, dto);
    if (dto.cnpj) p.cnpj = this.cnpjService.cleanCnpj(dto.cnpj);
    return this.repo.save(p);
  }

  async updateStatus(id: string, dto: UpdateStatusDto): Promise<Prospect> {
    const p = await this.findOne(id);
    p.status = dto.status;
    if (dto.notes) p.notes = dto.notes;
    if (dto.status === ProspectStatus.CONTATADO) p.lastContactAt = new Date();
    if (dto.status === ProspectStatus.CONVERTIDO) p.convertedAt = new Date();
    return this.repo.save(p);
  }

  async remove(id: string): Promise<void> {
    const p = await this.findOne(id);
    await this.repo.remove(p);
  }

  // ─── CNPJ enrichment ───────────────────────────────────────────────────────

  async enrichFromCnpj(id: string): Promise<Prospect> {
    const p = await this.findOne(id);
    if (!p.cnpj) throw new BadRequestException('Prospect não possui CNPJ cadastrado');

    const data = await this.cnpjService.lookup(p.cnpj);
    if (!data) throw new NotFoundException('CNPJ não encontrado na Receita Federal');

    const cnaeCode = String(data.cnae_fiscal);

    p.razaoSocial = data.razao_social ?? p.razaoSocial;
    if (data.nome_fantasia || p.nomeFantasia) p.nomeFantasia = data.nome_fantasia || p.nomeFantasia;
    if (!p.email && data.email) p.email = data.email;
    if (!p.phone) {
      const phone = this.cnpjService.extractPhone(data.ddd_telefone_1 ?? '');
      if (phone) p.phone = phone;
    }
    if (data.municipio) p.city = data.municipio;
    if (data.uf) p.state = data.uf;
    p.cnaeCode = cnaeCode;
    p.cnaeDescription = data.cnae_fiscal_descricao;
    p.cnaeSector = this.cnaeService.classify(cnaeCode);
    p.source = ProspectSource.BUSCA_CNPJ;

    return this.repo.save(p);
  }

  // ─── Bulk import ───────────────────────────────────────────────────────────

  async importCnpjs(
    fairId: string,
    dto: ImportCnpjsDto,
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const raw of dto.cnpjs) {
      const cnpj = this.cnpjService.cleanCnpj(raw);

      if (!this.cnpjService.isValid(cnpj)) {
        errors.push(`${raw}: formato inválido`);
        continue;
      }

      const existing = await this.repo.findOne({ where: { fairId, cnpj } });
      if (existing) {
        skipped++;
        continue;
      }

      const data = await this.cnpjService.lookup(cnpj);
      if (!data) {
        errors.push(`${cnpj}: não encontrado na Receita Federal`);
        continue;
      }

      const cnaeCode = String(data.cnae_fiscal);

      const phone = this.cnpjService.extractPhone(data.ddd_telefone_1 ?? '');
      await this.repo.save(
        this.repo.create({
          fairId,
          type: dto.type,
          source: ProspectSource.BUSCA_CNPJ,
          cnpj,
          razaoSocial: data.razao_social,
          ...(data.nome_fantasia ? { nomeFantasia: data.nome_fantasia } : {}),
          ...(data.email ? { email: data.email } : {}),
          ...(phone ? { phone } : {}),
          ...(data.municipio ? { city: data.municipio } : {}),
          ...(data.uf ? { state: data.uf } : {}),
          cnaeCode,
          cnaeDescription: data.cnae_fiscal_descricao,
          cnaeSector: this.cnaeService.classify(cnaeCode),
        } as Partial<Prospect>),
      );

      imported++;
      // Respeita rate limit da BrasilAPI (~1 req/s)
      await new Promise((r) => setTimeout(r, 1100));
    }

    return { imported, skipped, errors };
  }

  // ─── Criação automática via registro de visitante ─────────────────────────

  /**
   * Chamado pelo VisitorsService após cada inscrição.
   * Fire-and-forget — nunca bloqueia o fluxo de cadastro.
   *
   * Regras:
   * - Se já existe prospect com mesmo fairId + cnpj → marca como CONVERTIDO.
   * - Se não existe → cria como CONVERTIDO.
   * - CNAE é enriquecido de forma assíncrona (sem esperar BrasilAPI).
   */
  async createFromVisitor(
    visitor: {
      cnpj?: string;
      company: string;
      email?: string;
      phone?: string;
      city?: string;
      state?: string;
    },
    fairId: string,
  ): Promise<void> {
    const cnpj = visitor.cnpj ? this.cnpjService.cleanCnpj(visitor.cnpj) : undefined;

    let prospect: Prospect;

    if (cnpj) {
      const existing = await this.repo.findOne({ where: { fairId, cnpj } });
      if (existing) {
        existing.status = ProspectStatus.CONVERTIDO;
        existing.convertedAt = new Date();
        prospect = await this.repo.save(existing);
      } else {
        prospect = await this.repo.save(
          this.repo.create({
            fairId,
            type: ProspectType.VISITANTE,
            status: ProspectStatus.CONVERTIDO,
            source: ProspectSource.MANUAL,
            cnpj,
            razaoSocial: visitor.company,
            ...(visitor.email ? { email: visitor.email } : {}),
            ...(visitor.phone ? { phone: visitor.phone } : {}),
            ...(visitor.city ? { city: visitor.city } : {}),
            ...(visitor.state ? { state: visitor.state } : {}),
            convertedAt: new Date(),
          } as Partial<Prospect>),
        );
      }
    } else {
      prospect = await this.repo.save(
        this.repo.create({
          fairId,
          type: ProspectType.VISITANTE,
          status: ProspectStatus.CONVERTIDO,
          source: ProspectSource.MANUAL,
          razaoSocial: visitor.company,
          ...(visitor.email ? { email: visitor.email } : {}),
          ...(visitor.phone ? { phone: visitor.phone } : {}),
          ...(visitor.city ? { city: visitor.city } : {}),
          ...(visitor.state ? { state: visitor.state } : {}),
          convertedAt: new Date(),
        } as Partial<Prospect>),
      );
    }

    // Enriquece CNAE em background — não bloqueia o retorno
    if (cnpj && !prospect.cnaeCode) {
      this.enrichCnaeAsync(prospect.id, cnpj);
    }
  }

  private async enrichCnaeAsync(prospectId: string, cnpj: string): Promise<void> {
    try {
      const data = await this.cnpjService.lookup(cnpj);
      if (!data) return;

      const prospect = await this.repo.findOne({ where: { id: prospectId } });
      if (!prospect) return;

      const cnaeCode = String(data.cnae_fiscal);
      prospect.cnaeCode = cnaeCode;
      prospect.cnaeDescription = data.cnae_fiscal_descricao;
      prospect.cnaeSector = this.cnaeService.classify(cnaeCode);
      if (!prospect.nomeFantasia && data.nome_fantasia) prospect.nomeFantasia = data.nome_fantasia;

      await this.repo.save(prospect);
      this.logger.log(`CNAE enriched for prospect ${prospectId}: ${prospect.cnaeSector}`);
    } catch (error) {
      this.logger.warn(`CNAE async enrichment failed for ${prospectId}: ${error.message}`);
    }
  }

  // ─── Lookup avulso (não persiste) ─────────────────────────────────────────

  async lookupCnpj(cnpj: string) {
    const clean = this.cnpjService.cleanCnpj(cnpj);
    const data = await this.cnpjService.lookup(clean);
    if (!data) throw new NotFoundException('CNPJ não encontrado na Receita Federal');

    const cnaeCode = String(data.cnae_fiscal);
    return {
      ...data,
      cnpjFormatado: this.cnpjService.formatCnpj(clean),
      cnaeSector: this.cnaeService.classify(cnaeCode),
      isB2bPriority: this.cnaeService.isB2bPriority(this.cnaeService.classify(cnaeCode)),
    };
  }

  // ─── Analytics ─────────────────────────────────────────────────────────────

  async getAnalytics(fairId: string) {
    const all = await this.repo.find({ where: { fairId } });

    const total = all.length;
    const byType = {
      expositores: all.filter((p) => p.type === ProspectType.EXPOSITOR).length,
      visitantes: all.filter((p) => p.type === ProspectType.VISITANTE).length,
    };

    // Funil de conversão
    const funnel = Object.values(ProspectStatus).map((status) => ({
      status,
      count: all.filter((p) => p.status === status).length,
    }));

    const converted = all.filter((p) => p.status === ProspectStatus.CONVERTIDO).length;
    const contacted = all.filter(
      (p) =>
        p.status !== ProspectStatus.NOVO && p.status !== ProspectStatus.DESCARTADO,
    ).length;

    // Distribuição por setor (CNAE)
    const sectorMap = new Map<string, { count: number; b2bPriority: boolean }>();
    for (const p of all) {
      const sector = p.cnaeSector ?? 'Não classificado';
      const existing = sectorMap.get(sector) ?? {
        count: 0,
        b2bPriority: this.cnaeService.isB2bPriority(sector),
      };
      existing.count++;
      sectorMap.set(sector, existing);
    }
    const sectorDistribution = Array.from(sectorMap.entries())
      .map(([sector, data]) => ({ sector, ...data }))
      .sort((a, b) => b.count - a.count);

    // Distribuição geográfica
    const stateMap = new Map<string, number>();
    for (const p of all) {
      if (!p.state) continue;
      stateMap.set(p.state, (stateMap.get(p.state) ?? 0) + 1);
    }
    const geographicDistribution = Array.from(stateMap.entries())
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);

    // Top CNAEs (descrição detalhada)
    const cnaeDescMap = new Map<string, { description: string; sector: string; count: number }>();
    for (const p of all) {
      if (!p.cnaeCode) continue;
      const existing = cnaeDescMap.get(p.cnaeCode) ?? {
        description: p.cnaeDescription ?? p.cnaeCode,
        sector: p.cnaeSector ?? 'Outros',
        count: 0,
      };
      existing.count++;
      cnaeDescMap.set(p.cnaeCode, existing);
    }
    const topCnaes = Array.from(cnaeDescMap.entries())
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Chart-ready: setor (ApexCharts donut)
    const sectorChart = {
      labels: sectorDistribution.map((s) => s.sector),
      series: sectorDistribution.map((s) => s.count),
    };

    // Chart-ready: funil (ApexCharts bar)
    const funnelChart = {
      categories: funnel.map((f) => f.status),
      series: [{ name: 'Prospects', data: funnel.map((f) => f.count) }],
    };

    // Chart-ready: geografia (ApexCharts bar horizontal)
    const geoChart = {
      categories: geographicDistribution.map((g) => g.state),
      series: [{ name: 'Prospects', data: geographicDistribution.map((g) => g.count) }],
    };

    return {
      overview: {
        total,
        byType,
        conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
        contactRate: total > 0 ? Math.round((contacted / total) * 100) : 0,
        withEmail: all.filter((p) => p.email).length,
        withPhone: all.filter((p) => p.phone).length,
        enriched: all.filter((p) => p.cnaeCode).length,
      },
      funnel,
      sectorDistribution,
      geographicDistribution,
      topCnaes,
      charts: {
        sector: sectorChart,
        funnel: funnelChart,
        geographic: geoChart,
      },
    };
  }
}
