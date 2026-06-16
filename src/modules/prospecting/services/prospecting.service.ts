import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
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
import { GeoService } from './geo.service';
import { Fair } from '../../fairs/entity/fair.entity';

@Injectable()
export class ProspectingService {
  private readonly logger = new Logger(ProspectingService.name);

  constructor(
    @InjectRepository(Prospect)
    private readonly repo: Repository<Prospect>,
    @InjectRepository(Fair)
    private readonly fairRepo: Repository<Fair>,
    private readonly cnpjService: CnpjService,
    private readonly cnaeService: CnaeService,
    private readonly geoService: GeoService,
  ) {}

  // ─── Normalização geográfica ───────────────────────────────────────────────

  /** UF sempre maiúscula: "am" → "AM", "Am" → "AM" */
  private normalizeState(s: string): string {
    return s?.trim().toUpperCase() ?? s;
  }

  /** Título: "MANAUS" → "Manaus", "SÃO PAULO" → "São Paulo" */
  private toTitleCase(s: string): string {
    if (!s) return s;
    return s.trim().toLowerCase().replace(/(^|\s)(\S)/g, (_, sp, ch) => sp + ch.toUpperCase());
  }

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
    if (data.municipio) p.city = this.toTitleCase(data.municipio);
    if (data.uf) p.state = this.normalizeState(data.uf);
    if (data.bairro) p.neighborhood = this.toTitleCase(data.bairro);
    if (data.cep) p.cep = data.cep.replace(/\D/g, '');
    p.cnaeCode = cnaeCode;
    p.cnaeDescription = data.cnae_fiscal_descricao;
    p.cnaeSector = this.cnaeService.classify(cnaeCode);
    p.source = ProspectSource.BUSCA_CNPJ;

    if (data.cep && !p.latitude) {
      const geo = await this.geoService.geocodeCep(data.cep);
      if (geo) { p.latitude = geo.lat; p.longitude = geo.lng; }
    }

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
      const geo = data.cep ? await this.geoService.geocodeCep(data.cep) : null;

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
          ...(data.municipio ? { city: this.toTitleCase(data.municipio) } : {}),
          ...(data.uf ? { state: this.normalizeState(data.uf) } : {}),
          ...(data.bairro ? { neighborhood: this.toTitleCase(data.bairro) } : {}),
          ...(data.cep ? { cep: data.cep.replace(/\D/g, '') } : {}),
          ...(geo ? { latitude: geo.lat, longitude: geo.lng } : {}),
          cnaeCode,
          cnaeDescription: data.cnae_fiscal_descricao,
          cnaeSector: this.cnaeService.classify(cnaeCode),
        } as Partial<Prospect>),
      );

      imported++;
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
    skipEnrichment = false,
  ): Promise<'created' | 'updated'> {
    const cnpj = visitor.cnpj ? this.cnpjService.cleanCnpj(visitor.cnpj) : undefined;

    let prospect: Prospect;
    let action: 'created' | 'updated' = 'created';

    if (cnpj) {
      const existing = await this.repo.findOne({ where: { fairId, cnpj } });
      if (existing) {
        existing.status = ProspectStatus.CONVERTIDO;
        existing.convertedAt = new Date();
        prospect = await this.repo.save(existing);
        action = 'updated';
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
            ...(visitor.city ? { city: this.toTitleCase(visitor.city) } : {}),
            ...(visitor.state ? { state: this.normalizeState(visitor.state) } : {}),
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
          ...(visitor.city ? { city: this.toTitleCase(visitor.city) } : {}),
          ...(visitor.state ? { state: this.normalizeState(visitor.state) } : {}),
          convertedAt: new Date(),
        } as Partial<Prospect>),
      );
    }

    // Enriquece CNAE em background (apenas em cadastros individuais)
    if (!skipEnrichment && cnpj && !prospect.cnaeCode) {
      this.enrichCnaeAsync(prospect.id, cnpj);
    }

    return action;
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
      if (!prospect.city && data.municipio) prospect.city = this.toTitleCase(data.municipio);
      if (!prospect.state && data.uf) prospect.state = this.normalizeState(data.uf);
      if (!prospect.neighborhood && data.bairro) prospect.neighborhood = this.toTitleCase(data.bairro);
      if (data.cep) prospect.cep = data.cep.replace(/\D/g, '');
      if (data.cep && !prospect.latitude) {
        const geo = await this.geoService.geocodeCep(data.cep);
        if (geo) { prospect.latitude = geo.lat; prospect.longitude = geo.lng; }
      }

      await this.repo.save(prospect);
      this.logger.log(`CNAE enriched for prospect ${prospectId}: ${prospect.cnaeSector}`);
    } catch (err: unknown) {
      this.logger.warn(`CNAE async enrichment failed for ${prospectId}: ${(err as Error).message}`);
    }
  }

  // ─── Enriquecimento em lote (sequencial, respeita rate limit) ─────────────

  async enrichAllPending(fairId: string): Promise<{
    total: number;
    enriched: number;
    notFound: number;
    alreadyDone: number;
  }> {
    const prospects = await this.repo.find({
      where: { fairId },
      order: { createdAt: 'ASC' },
    });

    const pending = prospects.filter((p) => p.cnpj && !p.cnaeCode);
    const alreadyDone = prospects.filter((p) => p.cnaeCode).length;

    let enriched = 0;
    let notFound = 0;

    for (const prospect of pending) {
      const data = await this.cnpjService.lookup(prospect.cnpj);

      if (!data) {
        notFound++;
      } else {
        const cnaeCode = String(data.cnae_fiscal);
        prospect.cnaeCode = cnaeCode;
        prospect.cnaeDescription = data.cnae_fiscal_descricao;
        prospect.cnaeSector = this.cnaeService.classify(cnaeCode);
        if (!prospect.nomeFantasia && data.nome_fantasia) {
          prospect.nomeFantasia = data.nome_fantasia;
        }
        await this.repo.save(prospect);
        enriched++;
      }

      await new Promise((r) => setTimeout(r, 1100));
    }

    return { total: pending.length, enriched, notFound, alreadyDone };
  }

  /**
   * Enriquece CNAEs de TODOS os prospects (todas as feiras) que têm CNPJ mas não têm CNAE.
   * Deduplica por CNPJ: mesmo CNPJ em múltiplas feiras → 1 chamada BrasilAPI, n saves.
   * Executa em background — retorna promise que os callers podem aguardar ou ignorar.
   */
  async enrichAllPendingGlobal(): Promise<{
    total: number;
    uniqueCnpjs: number;
    enriched: number;
    notFound: number;
    alreadyDone: number;
  }> {
    const allPending = await this.repo
      .createQueryBuilder('p')
      .where('p.cnpj IS NOT NULL')
      .andWhere('p.cnaeCode IS NULL')
      .orderBy('p.cnpj')
      .getMany();

    const alreadyDone = await this.repo
      .createQueryBuilder('p')
      .where('p.cnaeCode IS NOT NULL')
      .getCount();

    type CnpjCacheEntry = {
      cnaeCode: string;
      cnaeDescription: string;
      cnaeSector: string;
      nomeFantasia?: string;
      city?: string;
      state?: string;
      neighborhood?: string;
      cep?: string;
      lat?: number | null;
      lng?: number | null;
    };
    const cnpjCache = new Map<string, CnpjCacheEntry | null>();

    let enriched = 0;
    let notFound = 0;

    for (const prospect of allPending) {
      const cnpj = prospect.cnpj;

      if (!cnpjCache.has(cnpj)) {
        const data = await this.cnpjService.lookup(cnpj);
        if (!data) {
          cnpjCache.set(cnpj, null);
        } else {
          const cnaeCode = String(data.cnae_fiscal);
          const geo = data.cep ? await this.geoService.geocodeCep(data.cep) : null;
          cnpjCache.set(cnpj, {
            cnaeCode,
            cnaeDescription: data.cnae_fiscal_descricao,
            cnaeSector: this.cnaeService.classify(cnaeCode),
            ...(data.nome_fantasia ? { nomeFantasia: data.nome_fantasia } : {}),
            ...(data.municipio ? { city: this.toTitleCase(data.municipio) } : {}),
            ...(data.uf ? { state: this.normalizeState(data.uf) } : {}),
            ...(data.bairro ? { neighborhood: this.toTitleCase(data.bairro) } : {}),
            ...(data.cep ? { cep: data.cep.replace(/\D/g, '') } : {}),
            ...(geo ? { lat: geo.lat, lng: geo.lng } : {}),
          });
          await new Promise((r) => setTimeout(r, 1100));
        }
      }

      const cached = cnpjCache.get(cnpj);
      if (!cached) {
        notFound++;
        continue;
      }

      prospect.cnaeCode = cached.cnaeCode;
      prospect.cnaeDescription = cached.cnaeDescription;
      prospect.cnaeSector = cached.cnaeSector;
      if (!prospect.nomeFantasia && cached.nomeFantasia) prospect.nomeFantasia = cached.nomeFantasia;
      if (!prospect.city && cached.city) prospect.city = this.toTitleCase(cached.city);
      if (!prospect.state && cached.state) prospect.state = this.normalizeState(cached.state);
      if (!prospect.neighborhood && cached.neighborhood) prospect.neighborhood = this.toTitleCase(cached.neighborhood);
      if (cached.cep) prospect.cep = cached.cep;
      if (!prospect.latitude && cached.lat) { prospect.latitude = cached.lat; prospect.longitude = cached.lng ?? null; }
      await this.repo.save(prospect);
      enriched++;
    }

    const uniqueCnpjs = cnpjCache.size;
    this.logger.log(
      `[enrich-all-global] done: ${enriched} enriched, ${notFound} not found, ${uniqueCnpjs} unique CNPJs consulted`,
    );

    return { total: allPending.length, uniqueCnpjs, enriched, notFound, alreadyDone };
  }

  /** Inicia enriquecimento global em background e retorna imediatamente. */
  startGlobalEnrichBackground(): { message: string } {
    const tag = `[enrich-all-bg-${Date.now()}]`;
    this.logger.log(`${tag} Starting global CNAE enrichment in background`);

    this.enrichAllPendingGlobal()
      .then((r) => this.logger.log(`${tag} Finished: ${JSON.stringify(r)}`))
      .catch((err) => this.logger.error(`${tag} Failed: ${err.message}`));

    return {
      message:
        'Enriquecimento global iniciado em background. Acompanhe os logs do servidor para o progresso. ' +
        'Cada CNPJ único leva ~1,1s — verifique GET /fairs/:fairId/prospects/analytics para acompanhar.',
    };
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

  // ─── Geo analytics ─────────────────────────────────────────────────────────

  /** Centroides aproximados de cada UF brasileira [longitude, latitude] — para Mapbox markers */
  private static readonly STATE_CENTROIDS: Record<string, [number, number]> = {
    AC: [-70.812, -9.975],  AL: [-36.782, -9.571],  AM: [-64.659, -4.077],
    AP: [-51.777,  1.410],  BA: [-41.708,-12.971],  CE: [-39.310, -5.498],
    DF: [-47.797,-15.780],  ES: [-40.308,-19.183],  GO: [-49.868,-16.642],
    MA: [-45.270, -5.420],  MG: [-44.698,-18.512],  MS: [-54.758,-20.510],
    MT: [-56.098,-12.642],  PA: [-52.291, -5.534],  PB: [-36.782, -7.239],
    PE: [-37.343, -8.813],  PI: [-42.811, -7.718],  PR: [-51.615,-25.244],
    RJ: [-43.172,-22.913],  RN: [-36.528, -5.793],  RO: [-63.034,-11.504],
    RR: [-61.399,  2.820],  RS: [-53.186,-30.034],  SC: [-50.471,-27.596],
    SE: [-37.447,-10.574],  SP: [-48.549,-22.974],  TO: [-48.333,-10.181],
  };

  async getGeoAnalytics(fairId: string) {
    const [all, fair] = await Promise.all([
      this.repo.find({ where: { fairId } }),
      this.fairRepo.findOne({ where: { id: fairId } }),
    ]);
    const total = all.length;

    // ── centro da feira para zoom inicial do Mapbox ─────────────────────────
    const fairCenter = fair
      ? {
          longitude: fair.longitude,
          latitude: fair.latitude,
          city: fair.city ?? null,
          state: fair.state ?? null,
          zoom: 12,
        }
      : null;

    // ── por estado — normaliza na leitura para dados sujos no banco ──────────
    const stateMap = new Map<string, number>();
    for (const p of all) {
      if (!p.state) continue;
      const s = this.normalizeState(p.state);
      stateMap.set(s, (stateMap.get(s) ?? 0) + 1);
    }
    const byState = Array.from(stateMap.entries())
      .map(([state, count]) => ({
        state,
        count,
        percentage: total > 0 ? +((count / total) * 100).toFixed(1) : 0,
        coordinates: ProspectingService.STATE_CENTROIDS[state] ?? null,
      }))
      .sort((a, b) => b.count - a.count);

    // ── por cidade — média das lat/lng dos prospects para coordenada real ────
    type CityEntry = { city: string; state: string; count: number; latSum: number; lngSum: number; coordCount: number };
    const cityMap = new Map<string, CityEntry>();
    for (const p of all) {
      if (!p.city || !p.state) continue;
      const city  = this.toTitleCase(p.city);
      const state = this.normalizeState(p.state);
      const key   = `${city.toUpperCase()}__${state}`;
      const entry = cityMap.get(key) ?? { city, state, count: 0, latSum: 0, lngSum: 0, coordCount: 0 };
      entry.count++;
      if (p.latitude != null && p.longitude != null) {
        entry.latSum += Number(p.latitude);
        entry.lngSum += Number(p.longitude);
        entry.coordCount++;
      }
      cityMap.set(key, entry);
    }
    const byCity = Array.from(cityMap.values())
      .map(({ latSum, lngSum, coordCount, ...rest }) => ({
        ...rest,
        coordinates: coordCount > 0
          ? ([+(lngSum / coordCount).toFixed(6), +(latSum / coordCount).toFixed(6)] as [number, number])
          : (ProspectingService.STATE_CENTROIDS[rest.state] ?? null),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    // ── por bairro — centroide calculado pela média das coordenadas reais ────
    type NeighborhoodEntry = {
      neighborhood: string; city: string; state: string; count: number;
      latSum: number; lngSum: number; coordCount: number;
    };
    const neighborhoodMap = new Map<string, NeighborhoodEntry>();
    for (const p of all) {
      if (!p.neighborhood || !p.city || !p.state) continue;
      const neighborhood = this.toTitleCase(p.neighborhood);
      const city         = this.toTitleCase(p.city);
      const state        = this.normalizeState(p.state);
      const key          = `${neighborhood.toUpperCase()}__${city.toUpperCase()}__${state}`;
      const entry        = neighborhoodMap.get(key) ?? {
        neighborhood, city, state, count: 0, latSum: 0, lngSum: 0, coordCount: 0,
      };
      entry.count++;
      if (p.latitude != null && p.longitude != null) {
        entry.latSum += Number(p.latitude);
        entry.lngSum += Number(p.longitude);
        entry.coordCount++;
      }
      neighborhoodMap.set(key, entry);
    }
    const byNeighborhood = Array.from(neighborhoodMap.values())
      .map(({ latSum, lngSum, coordCount, ...rest }) => ({
        ...rest,
        coordinates: coordCount > 0
          ? ([+(lngSum / coordCount).toFixed(6), +(latSum / coordCount).toFixed(6)] as [number, number])
          : null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);

    // ── top setores por estado ───────────────────────────────────────────────
    const stateSectorMap = new Map<string, Map<string, number>>();
    for (const p of all) {
      if (!p.state || !p.cnaeSector) continue;
      const s = this.normalizeState(p.state);
      if (!stateSectorMap.has(s)) stateSectorMap.set(s, new Map());
      const sectors = stateSectorMap.get(s)!;
      sectors.set(p.cnaeSector, (sectors.get(p.cnaeSector) ?? 0) + 1);
    }
    const bySectorPerState = Array.from(stateSectorMap.entries()).map(([state, sectors]) => ({
      state,
      sectors: Array.from(sectors.entries())
        .map(([sector, count]) => ({ sector, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    }));

    // ── GeoJSON para Mapbox ─────────────────────────────────────────────────
    const mapbox = {
      // FeatureCollection de estados — choropleth / bubble layer
      statesGeoJson: {
        type: 'FeatureCollection' as const,
        features: byState
          .filter((s) => s.coordinates)
          .map((s) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: s.coordinates! },
            properties: { state: s.state, count: s.count, percentage: s.percentage },
          })),
      },
      // FeatureCollection de cidades — coordenadas reais (média dos prospects) com fallback no centroide do estado
      citiesGeoJson: {
        type: 'FeatureCollection' as const,
        features: byCity
          .filter((c) => c.coordinates)
          .map((c) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: c.coordinates! },
            properties: { city: c.city, state: c.state, count: c.count },
          })),
      },
      // FeatureCollection de bairros — centroide calculado pela média das lat/lng dos prospects
      neighborhoodsGeoJson: {
        type: 'FeatureCollection' as const,
        features: byNeighborhood
          .filter((n) => n.coordinates)
          .map((n) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: n.coordinates! },
            properties: {
              neighborhood: n.neighborhood,
              city: n.city,
              state: n.state,
              count: n.count,
            },
          })),
      },
    };

    return {
      fairCenter,
      summary: {
        totalProspects: total,
        withState: all.filter((p) => p.state).length,
        withCity: all.filter((p) => p.city).length,
        withNeighborhood: all.filter((p) => p.neighborhood).length,
        withCoordinates: all.filter((p) => p.latitude != null).length,
        uniqueStates: byState.length,
        uniqueCities: byCity.length,
        uniqueNeighborhoods: byNeighborhood.length,
      },
      byState,
      byCity,
      byNeighborhood,
      bySectorPerState,
      mapbox,
      charts: {
        stateBar: {
          categories: byState.map((s) => s.state),
          series: [{ name: 'Prospects', data: byState.map((s) => s.count) }],
        },
        cityTreemap: byCity.slice(0, 20).map((c) => ({
          x: `${c.city}/${c.state}`,
          y: c.count,
        })),
        neighborhoodBar: {
          categories: byNeighborhood.slice(0, 15).map((n) => `${n.neighborhood}, ${n.city}`),
          series: [{ name: 'Lojas', data: byNeighborhood.slice(0, 15).map((n) => n.count) }],
        },
      },
    };
  }

  async geocodeAllPending(): Promise<{ geocoded: number; failed: number; skipped: number }> {
    const prospects = await this.repo
      .createQueryBuilder('p')
      .where('p.cep IS NOT NULL')
      .andWhere('p.latitude IS NULL')
      .getMany();

    this.logger.log(`[geocode-all] Found ${prospects.length} prospects with CEP but no coordinates`);

    const cepCache = new Map<string, { lat: number; lng: number } | null>();
    let geocoded = 0;
    let failed = 0;
    let skipped = 0;

    for (const prospect of prospects) {
      const clean = prospect.cep?.replace(/\D/g, '');
      if (!clean || clean.length !== 8) { skipped++; continue; }

      if (!cepCache.has(clean)) {
        const geo = await this.geoService.geocodeCep(clean);
        cepCache.set(clean, geo ? { lat: geo.lat, lng: geo.lng } : null);
        await new Promise((r) => setTimeout(r, 250));
      }

      const coords = cepCache.get(clean);
      if (!coords) { failed++; continue; }

      await this.repo.update(prospect.id, { latitude: coords.lat, longitude: coords.lng });
      geocoded++;

      if (geocoded % 50 === 0) {
        this.logger.log(`[geocode-all] Progress: ${geocoded}/${prospects.length}`);
      }
    }

    this.logger.log(`[geocode-all] Done — geocoded: ${geocoded}, failed: ${failed}, skipped: ${skipped}`);
    return { geocoded, failed, skipped };
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
      const s = this.normalizeState(p.state);
      stateMap.set(s, (stateMap.get(s) ?? 0) + 1);
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
