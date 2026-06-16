/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Visitor } from './entities/visitor.entity';
import { Repository } from 'typeorm';
import { CreateVisitorInputDto } from './visitors.dto';
import { EmailsService } from '../emails/emails.service';
import { User } from '../users/entitie/users.entity';
import { UpdateVisitorDto } from './update-visitor.dto';
import { Fair } from '../fairs/entity/fair.entity';
import { EUserRole } from 'src/enum/role';
import {
  PaginatedVisitorsDto,
  PaginatedResponse,
} from './dto/paginated-visitors.dto';
import * as puppeteer from 'puppeteer';
import { ProspectingService } from '../prospecting/services/prospecting.service';

@Injectable()
export class VisitorsService {
  private readonly logger = new Logger(VisitorsService.name);

  constructor(
    @InjectRepository(Visitor) private visitorRepository: Repository<Visitor>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Fair) private fairRepository: Repository<Fair>,
    private readonly emailsService: EmailsService,
    private readonly prospectingService: ProspectingService,
  ) {}

  async getVisitors(user: User | null, fairId?: string): Promise<Visitor[]> {
    const query = this.visitorRepository
      .createQueryBuilder('visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      );

    // Se user é null (rota pública), apenas filtrar por fairId se fornecido
    if (!user) {
      if (fairId) {
        query.where('fv.fairsId = :fairId', { fairId });
      }
    } else if (user.role === EUserRole.CONSULTANT) {
      // Consultores podem ver todos os visitantes
      if (fairId) {
        query.where('fv.fairsId = :fairId', { fairId });
      }
    } else {
      // Outros papéis: mantém o filtro por fairId se enviado, senão traz tudo
      if (fairId) {
        query.where('fv.fairsId = :fairId', { fairId });
      }
    }

    return await query.getMany();
  }

  async getVisitorsPaginated(
    user: User,
    dto: PaginatedVisitorsDto,
  ): Promise<PaginatedResponse<Visitor>> {
    const {
      fairId,
      page = 1,
      limit = 50,
      search = '',
      searchField = 'all',
      sortBy = 'name',
      sortOrder = 'asc',
      dateFrom,
      dateTo,
    } = dto;

    const query = this.visitorRepository
      .createQueryBuilder('visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      );

    // Aplicar filtros de autorização
    if (user.role === EUserRole.CONSULTANT) {
      // Consultores podem ver todos os visitantes
      if (fairId) {
        query.where('fv.fairsId = :fairId', { fairId });
      }
    } else {
      if (fairId) {
        query.where('fv.fairsId = :fairId', { fairId });
      }
    }

    // Aplicar filtro de busca com ranking de relevância
    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase();

      if (searchField === 'all') {
        // Busca inteligente com pontuação de relevância
        const relevanceParts: string[] = [];

        // Sistema de pontuação por relevância (0-100 pontos)

        // Matches exatos têm maior pontuação
        relevanceParts.push(
          `CASE WHEN LOWER(visitor.name) = '${searchTerm}' THEN 100 ELSE 0 END`,
        );
        relevanceParts.push(
          `CASE WHEN LOWER(visitor.company) = '${searchTerm}' THEN 95 ELSE 0 END`,
        );
        relevanceParts.push(
          `CASE WHEN LOWER(visitor.registrationCode) = '${searchTerm}' THEN 90 ELSE 0 END`,
        );
        relevanceParts.push(
          `CASE WHEN LOWER(visitor.email) = '${searchTerm}' THEN 90 ELSE 0 END`,
        );

        // Matches que começam com o termo
        relevanceParts.push(
          `CASE WHEN LOWER(visitor.name) LIKE '${searchTerm}%' THEN 85 ELSE 0 END`,
        );
        relevanceParts.push(
          `CASE WHEN LOWER(visitor.company) LIKE '${searchTerm}%' THEN 80 ELSE 0 END`,
        );
        relevanceParts.push(
          `CASE WHEN LOWER(visitor.email) LIKE '${searchTerm}%' THEN 75 ELSE 0 END`,
        );

        // Matches parciais
        relevanceParts.push(
          `CASE WHEN LOWER(visitor.name) LIKE '%${searchTerm}%' THEN 70 ELSE 0 END`,
        );
        relevanceParts.push(
          `CASE WHEN LOWER(visitor.company) LIKE '%${searchTerm}%' THEN 65 ELSE 0 END`,
        );
        relevanceParts.push(
          `CASE WHEN LOWER(visitor.email) LIKE '%${searchTerm}%' THEN 60 ELSE 0 END`,
        );

        // Telefone e CNPJ (busca simples)
        const cleanTerm = searchTerm.replace(/\D/g, '');
        if (cleanTerm.length >= 3) {
          // Pelo menos 3 dígitos para ser relevante
          relevanceParts.push(
            `CASE WHEN visitor.phone LIKE '%${cleanTerm}%' THEN 55 ELSE 0 END`,
          );
          relevanceParts.push(
            `CASE WHEN visitor.cnpj LIKE '%${cleanTerm}%' THEN 55 ELSE 0 END`,
          );
        }

        // Código de registro parcial
        relevanceParts.push(
          `CASE WHEN LOWER(visitor.registrationCode) LIKE '%${searchTerm}%' THEN 50 ELSE 0 END`,
        );

        // Query de relevância total
        const relevanceScore = `(${relevanceParts.join(' + ')})`;

        // Adicionar campo de relevância à query
        query.addSelect(relevanceScore, 'relevance_score');

        // Filtrar apenas resultados com pontuação > 0
        query.andWhere(`${relevanceScore} > 0`);
      } else {
        // Busca específica por campo com relevância
        const fieldMap = {
          name: 'visitor.name',
          email: 'visitor.email',
          company: 'visitor.company',
          phone: 'visitor.phone',
          registrationCode: 'visitor.registrationCode',
          cnpj: 'visitor.cnpj',
        };

        const dbField = fieldMap[searchField as keyof typeof fieldMap];
        if (dbField) {
          const relevanceParts: string[] = [];

          if (searchField === 'phone' || searchField === 'cnpj') {
            // Para números, também buscar versão limpa
            const cleanTerm = searchTerm.replace(/\D/g, '');
            relevanceParts.push(
              `CASE WHEN ${dbField} LIKE '%${cleanTerm}%' THEN 100 ELSE 0 END`,
            );
            relevanceParts.push(
              `CASE WHEN ${dbField} LIKE '%${searchTerm}%' THEN 70 ELSE 0 END`,
            );
          } else {
            // Para texto
            relevanceParts.push(
              `CASE WHEN LOWER(${dbField}) = '${searchTerm}' THEN 100 ELSE 0 END`,
            );
            relevanceParts.push(
              `CASE WHEN LOWER(${dbField}) LIKE '${searchTerm}%' THEN 85 ELSE 0 END`,
            );
            relevanceParts.push(
              `CASE WHEN LOWER(${dbField}) LIKE '%${searchTerm}%' THEN 70 ELSE 0 END`,
            );
          }

          const relevanceScore = `(${relevanceParts.join(' + ')})`;
          query.addSelect(relevanceScore, 'relevance_score');
          query.andWhere(`${relevanceScore} > 0`);
        }
      }
    }

    // Filtro por período de cadastro
    if (dateFrom) {
      query.andWhere('visitor.registrationDate >= :dateFrom', {
        dateFrom: new Date(dateFrom),
      });
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      query.andWhere('visitor.registrationDate <= :dateTo', { dateTo: end });
    }

    // Aplicar ordenação - se há busca, ordena por relevância primeiro
    if (search && search.trim()) {
      query.orderBy('relevance_score', 'DESC');
      // Ordenação secundária pelo campo escolhido
      const sortField =
        sortBy === 'registrationCode'
          ? 'visitor.registrationCode'
          : `visitor.${sortBy}`;
      query.addOrderBy(sortField, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    } else {
      // Sem busca, usa ordenação normal
      const sortField =
        sortBy === 'registrationCode'
          ? 'visitor.registrationCode'
          : `visitor.${sortBy}`;
      query.orderBy(sortField, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    }

    // Contar total de registros
    const total = await query.getCount();

    // Calcular offset e aplicar paginação
    const offset = (page - 1) * limit;
    query.skip(offset).take(limit);

    // Executar query
    const data = await query.getMany();

    // Calcular meta dados
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  async getVisitorsStats(user: User, fairId?: string) {
    const query = this.visitorRepository
      .createQueryBuilder('visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      );

    // Aplicar filtros de autorização (mesmo que no getVisitors)
    if (user.role === EUserRole.CONSULTANT) {
      // Consultores podem ver todos os visitantes
      if (fairId) {
        query.where('fv.fairsId = :fairId', { fairId });
      }
    } else {
      if (fairId) {
        query.where('fv.fairsId = :fairId', { fairId });
      }
    }

    // Total de visitantes
    const total = await query.getCount();

    // Visitantes dos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentQuery = query.clone();
    const recent = await recentQuery
      .andWhere('visitor.registrationDate >= :sevenDaysAgo', { sevenDaysAgo })
      .getCount();

    // Empresas únicas
    const companiesQuery = query.clone();
    const companiesResult = await companiesQuery
      .select('COUNT(DISTINCT visitor.company)', 'companies')
      .andWhere('visitor.company IS NOT NULL')
      .andWhere('visitor.company != :empty', { empty: '' })
      .getRawOne();

    return {
      total,
      recent,
      companies: Number.parseInt(String(companiesResult?.companies || '0')),
      recentPercentage: total > 0 ? Math.round((recent / total) * 100) : 0,
    };
  }

  // ── Lookup cross-feiras ──────────────────────────────────────────────────

  /**
   * Busca visitantes em TODAS as feiras combinando até 4 campos:
   * nome, telefone, cnpj, email.
   *
   * Regras:
   * - Mínimo 2 parâmetros devem ser fornecidos.
   * - Cada parâmetro fornecido é um filtro AND (visitante precisa bater em TODOS).
   * - Busca parcial (LIKE %valor%) em todos os campos.
   *
   * Retorna dados do visitante + histórico de feiras + campos vazios.
   */
  async lookupVisitors(params: {
    name?: string;
    phone?: string;
    cnpj?: string;
    email?: string;
  }): Promise<
    Array<{
      registrationCode: string;
      name: string;
      company: string;
      email: string;
      cnpj: string;
      phone: string;
      zipCode: string;
      street: string | null;
      number: string | null;
      complement: string | null;
      neighborhood: string | null;
      city: string | null;
      state: string | null;
      sectors: string[];
      howDidYouKnow: string;
      category: string;
      /** Campos que estão vazios/nulos — o frontend deve destacá-los no formulário */
      missingFields: string[];
      /** Feiras que esse visitante já participou */
      fairHistory: Array<{
        fairId: string;
        fairName: string;
        state: string | null;
        startDate: Date | null;
      }>;
    }>
  > {
    const { name, phone, cnpj, email } = params;

    // Normaliza e filtra apenas os parâmetros enviados
    const filters = {
      name: name?.trim() || null,
      phone: phone?.trim() || null,
      cnpj: cnpj?.replace(/\D/g, '') || null,
      email: email?.trim().toLowerCase() || null,
    };

    const activeFilters = Object.values(filters).filter(Boolean);
    if (activeFilters.length < 2) return [];

    const qb = this.visitorRepository
      .createQueryBuilder('visitor')
      .leftJoinAndSelect('visitor.fair_visitor', 'fair')
      .orderBy('visitor.registrationDate', 'DESC')
      .take(20);

    // Cada filtro fornecido vira um AND WHERE
    if (filters.name) {
      qb.andWhere('LOWER(visitor.name) LIKE :name', {
        name: `%${filters.name.toLowerCase()}%`,
      });
    }
    if (filters.email) {
      qb.andWhere('LOWER(visitor.email) LIKE :email', {
        email: `%${filters.email}%`,
      });
    }
    if (filters.cnpj) {
      qb.andWhere('visitor.cnpj LIKE :cnpj', {
        cnpj: `%${filters.cnpj}%`,
      });
    }
    if (filters.phone) {
      // Compara dígitos para ignorar formatação (parênteses, traços, espaços)
      const cleanPhone = filters.phone.replace(/\D/g, '');
      qb.andWhere(
        'REPLACE(REPLACE(REPLACE(REPLACE(visitor.phone," ",""),"-",""),"(",""),")","") LIKE :phone',
        {
          phone: `%${cleanPhone}%`,
        },
      );
    }

    const visitors = await qb.getMany();

    const REQUIRED_FIELDS: Array<keyof Visitor> = [
      'name',
      'company',
      'email',
      'cnpj',
      'phone',
      'zipCode',
      'sectors',
      'howDidYouKnow',
      'category',
    ];

    return visitors.map((v) => {
      const missingFields = REQUIRED_FIELDS.filter((f) => {
        const val = v[f];
        if (Array.isArray(val)) return val.length === 0;
        return !val;
      }) as string[];

      const fairHistory = (v.fair_visitor ?? []).map((f) => ({
        fairId: f.id,
        fairName: f.name,
        state: f.state ?? null,
        startDate: f.startDate ?? null,
      }));

      return {
        registrationCode: v.registrationCode,
        name: v.name,
        company: v.company,
        email: v.email,
        cnpj: v.cnpj,
        phone: v.phone,
        zipCode: v.zipCode,
        street: v.street ?? null,
        number: v.number ?? null,
        complement: v.complement ?? null,
        neighborhood: v.neighborhood ?? null,
        city: v.city ?? null,
        state: v.state ?? null,
        sectors: v.sectors ?? [],
        howDidYouKnow: v.howDidYouKnow,
        category: v.category,
        missingFields,
        fairHistory,
      };
    });
  }

  // ── Enroll visitante existente em nova feira ──────────────────────────────

  /**
   * Matricula um visitante já cadastrado em uma nova feira.
   * Não cria novo registro — apenas adiciona a entrada em fair_visitor
   * e dispara o email de confirmação para a nova feira.
   *
   * Retorna ConflictException se já estiver inscrito na feira.
   */
  async enrollInFair(
    registrationCode: string,
    fairId: string,
  ): Promise<Visitor> {
    const visitor = await this.visitorRepository.findOne({
      where: { registrationCode },
      relations: ['fair_visitor'],
    });
    if (!visitor) throw new NotFoundException('Visitante não encontrado');

    const fair = await this.fairRepository.findOne({ where: { id: fairId } });
    if (!fair) throw new NotFoundException('Feira não encontrada');

    const alreadyEnrolled = visitor.fair_visitor.some((f) => f.id === fairId);
    if (alreadyEnrolled) {
      // Idempotente — retorna o visitante sem duplicar
      return visitor;
    }

    visitor.fair_visitor = [...visitor.fair_visitor, fair];
    const saved = await this.visitorRepository.save(visitor);

    // Dispara email de confirmação para a nova feira
    try {
      await this.emailsService.sendConfirmationEmail(
        saved.email,
        saved.name,
        saved.registrationCode,
        fairId,
      );
    } catch (err) {
      console.error('Erro enviando email de confirmação no enroll:', err);
    }

    // Registra/atualiza prospect para a nova feira — fire-and-forget
    this.prospectingService
      .createFromVisitor(
        {
          cnpj: saved.cnpj,
          company: saved.company,
          email: saved.email,
          phone: saved.phone,
          city: saved.city ?? undefined,
          state: saved.state ?? undefined,
        },
        fairId,
      )
      .catch((err) =>
        this.logger.warn(`Prospect enroll failed for visitor ${saved.registrationCode}: ${err.message}`),
      );

    return saved;
  }

  // ── Criação de novo visitante ─────────────────────────────────────────────

  async createVisitor(
    dto: CreateVisitorInputDto,
    userId?: string,
  ): Promise<Visitor> {
    // Cria nova entidade sem registrationCode (gerado pelo DB)
    const newVisitor = this.visitorRepository.create({
      ...dto,
      createdBy: userId ? { id: +userId } : undefined,
      fair_visitor: [{ id: dto.fair_visitor }],
    });

    let savedVisitor: Visitor;
    try {
      // Ao salvar, o PrimaryGeneratedColumn gera o registrationCode
      const result = await this.visitorRepository.save(newVisitor);
      savedVisitor = Array.isArray(result) ? result[0] : result;
    } catch (err) {
      console.log('Erro ao salvar visitante:', err);
      throw new InternalServerErrorException('Erro ao salvar visitante');
    }

    // Agora o savedVisitor.registrationCode contém o UUID gerado
    try {
      // Envia e-mail de confirmação com QR code e link do Calendar
      await this.emailsService.sendConfirmationEmail(
        savedVisitor.email,
        savedVisitor.name,
        savedVisitor.registrationCode,
        dto.fair_visitor,
      );
    } catch (err) {
      console.error('Erro enviando email:', err);
    }

    // Registra/atualiza prospect — fire-and-forget, não bloqueia o retorno
    this.prospectingService
      .createFromVisitor(
        {
          cnpj: savedVisitor.cnpj,
          company: savedVisitor.company,
          email: savedVisitor.email,
          phone: savedVisitor.phone,
          city: savedVisitor.city ?? undefined,
          state: savedVisitor.state ?? undefined,
        },
        dto.fair_visitor,
      )
      .catch((err) =>
        this.logger.warn(`Prospect creation failed for visitor ${savedVisitor.registrationCode}: ${err.message}`),
      );

    return savedVisitor;
  }

  getVisitor(id: number) {
    return this.visitorRepository.findOne({
      where: { registrationCode: id.toString() },
    });
  }

  async getVisitorByRegistrationCode(registrationCode: string, fairId: string) {
    if (!fairId) {
      throw new BadRequestException('Fair ID is required');
    }

    const visitor = await this.visitorRepository
      .createQueryBuilder('visitor')
      // carrega só a feira específica (filtrando por fairId)
      .innerJoinAndSelect(
        'visitor.fair_visitor', // propriedade da entidade
        'fair',
        'fair.id = :fairId',
        { fairId },
      )
      .where('visitor.registrationCode = :registrationCode', {
        registrationCode,
      })
      .getOne();

    if (!visitor) {
      throw new NotFoundException('Visitor not found for the specified fair');
    }

    return visitor;
  }

  async deleteVisitor(id: string) {
    const visitor = await this.visitorRepository.findOne({
      where: { registrationCode: id.toString() },
    });

    if (!visitor) {
      throw new NotFoundException('Visitor not found');
    }

    try {
      await this.visitorRepository.remove(visitor);
      return { message: 'Visitor deleted successfully' };
    } catch (error) {
      throw new InternalServerErrorException('Error deleting visitor');
    }
  }

  async updateVisitor(
    registrationCode: string,
    updateDto: UpdateVisitorDto,
  ): Promise<Visitor> {
    const visitor = await this.visitorRepository.findOne({
      where: { registrationCode },
      relations: ['fair_visitor'],
    });
    if (!visitor) {
      throw new NotFoundException('Visitor not found');
    }

    Object.assign(visitor, {
      name: updateDto.name,
      company: updateDto.company,
      email: updateDto.email,
      cnpj: updateDto.cnpj,
      phone: updateDto.phone,
      zipCode: updateDto.zipCode,
      street: updateDto.street,
      number: updateDto.number,
      complement: updateDto.complement,
      neighborhood: updateDto.neighborhood,
      city: updateDto.city,
      state: updateDto.state,
      sectors: updateDto.sectors,
      howDidYouKnow: updateDto.howDidYouKnow,
      category: updateDto.category,
      registrationDate: updateDto.registrationDate
        ? new Date(updateDto.registrationDate)
        : visitor.registrationDate,
    });

    if (updateDto.fairIds) {
      const fairs = await this.fairRepository.findByIds(updateDto.fairIds);
      if (fairs.length !== updateDto.fairIds.length) {
        throw new NotFoundException('One or more fairs not found');
      }
      visitor.fair_visitor = fairs;
    }

    return this.visitorRepository.save(visitor);
  }

  async generateVisitorsPdf(
    user: User | null,
    fairId: string,
  ): Promise<Buffer> {
    console.log(`[PDF] Buscando visitantes para feira: ${fairId}`);

    try {
      // Primeiro verificar se a feira existe
      const fair = await this.fairRepository.findOne({
        where: { id: fairId },
      });

      if (!fair) {
        throw new NotFoundException(`Feira com ID ${fairId} não encontrada`);
      }

      // Buscar todos os visitantes da feira
      const visitors = await this.getVisitors(user, fairId);
      console.log(`[PDF] Encontrados ${visitors.length} visitantes`);

      // Gerar HTML para o PDF
      const html = this.generateVisitorsHtml(visitors, fair);

      // Gerar PDF com Puppeteer
      console.log('[PDF] Iniciando geração do PDF...');
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm',
        },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="font-size: 9px; color: #14293D; width: 100%; display: flex; justify-content: flex-end; align-items: center; padding: 0 15mm;">
            <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
          </div>
        `,
      });

      await browser.close();
      console.log('[PDF] PDF gerado com sucesso');

      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error('[PDF] Erro ao gerar PDF:', error);
      throw new InternalServerErrorException(
        'Erro ao gerar PDF dos visitantes',
      );
    }
  }

  private generateVisitorsHtml(visitors: Visitor[], fair: Fair): string {
    const currentDate = new Date().toLocaleDateString('pt-BR');

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lista de Participantes - ${fair.name}</title>
        <style>
            @page {
                size: A4 landscape;
                margin: 15mm;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                margin: 0;
                padding: 15px;
                color: #14293D;
                position: relative;
                min-height: 100vh;
            }
            
            /* Logo de fundo */
            .background-logo {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 300px;
                height: auto;
                opacity: 0.1;
                z-index: -1;
            }
            
            /* Cabeçalho */
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                page-break-inside: avoid;
            }
            
            .title {
                font-size: 18px;
                font-weight: bold;
                margin: 0;
            }
            
            /* Tabela */
            .table-container {
                width: 100%;
                border-collapse: collapse;
            }
            
            .table-header {
                background-color: #FAFAFA;
                border-bottom: 1px solid #E4E4E7;
                page-break-inside: avoid;
            }
            
            .table-row {
                border-bottom: 1px solid #E4E4E7;
                page-break-inside: avoid;
            }
            
            .table-row:nth-child(even) {
                background-color: #FAFAFA;
            }
            
            .cell {
                font-size: 9px;
                color: #14293D;
                padding: 6px 4px;
                vertical-align: top;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            
            .header-cell {
                font-size: 10px;
                font-weight: bold;
                color: #71717A;
                padding: 6px 4px;
            }
            
            /* Larguras das colunas */
            .col-name { width: 20%; }
            .col-company { width: 20%; }
            .col-email { width: 25%; }
            .col-cnpj { width: 15%; }
            .col-phone { width: 12%; }
            .col-zipcode { width: 8%; }
            
            /* Rodapé */
            .footer {
                position: fixed;
                bottom: 15mm;
                left: 15mm;
                right: 15mm;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-top: 1px solid #E4E4E7;
                padding-top: 4px;
                font-size: 9px;
                color: #14293D;
                background: white;
            }
            
            .footer-text {
                margin: 0;
            }
            
            /* Quebra de página */
            .page-break {
                page-break-before: always;
            }
            
            /* Evitar quebra de página no meio da linha */
            tr {
                page-break-inside: avoid;
            }
            
            /* Responsividade para impressão */
            @media print {
                body {
                    print-color-adjust: exact;
                    -webkit-print-color-adjust: exact;
                }
                
                .table-container {
                    font-size: 8px;
                }
                
                .cell {
                    font-size: 8px;
                    padding: 4px 2px;
                }
                
                .header-cell {
                    font-size: 9px;
                    padding: 4px 2px;
                }
            }
        </style>
    </head>
    <body>
        <!-- Cabeçalho -->
        <div class="header">
            <h1 class="title">Lista de Participantes - ${fair.name}</h1>
        </div>
        
        <!-- Tabela -->
        <table class="table-container">
            <thead>
                <tr class="table-header">
                    <th class="header-cell col-name">Nome</th>
                    <th class="header-cell col-company">Empresa</th>
                    <th class="header-cell col-email">Email</th>
                    <th class="header-cell col-cnpj">CNPJ</th>
                    <th class="header-cell col-phone">Telefone</th>
                    <th class="header-cell col-zipcode">CEP</th>
                </tr>
            </thead>
            <tbody>
                ${visitors
                  .map(
                    (visitor) => `
                    <tr class="table-row">
                        <td class="cell col-name">${visitor.name}</td>
                        <td class="cell col-company">${visitor.company}</td>
                        <td class="cell col-email">${visitor.email}</td>
                        <td class="cell col-cnpj">${visitor.category?.toLowerCase() === 'visitante' ? 'Visitante' : visitor.cnpj || 'N/A'}</td>
                        <td class="cell col-phone">${visitor.phone}</td>
                        <td class="cell col-zipcode">${visitor.zipCode}</td>
                    </tr>
                `,
                  )
                  .join('')}
            </tbody>
        </table>
    </body>
    </html>
    `;
  }
}
