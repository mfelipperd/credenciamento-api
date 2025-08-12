/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
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

@Injectable()
export class VisitorsService {
  constructor(
    @InjectRepository(Visitor) private visitorRepository: Repository<Visitor>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Fair) private fairRepository: Repository<Fair>,
    private readonly emailsService: EmailsService,
  ) {}

  async getVisitors(user: User, fairId?: string): Promise<Visitor[]> {
    const query = this.visitorRepository
      .createQueryBuilder('visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      );

    if (user.role === EUserRole.CONSULTANT) {
      const allowed = user.fairIds ?? [];

      if (fairId) {
        if (!allowed.includes(fairId)) {
          return [];
        }
        query.where('fv.fairsId = :fairId', { fairId });
      } else {
        // Sem fairId, retorna tudo que está em user.fairIds
        if (allowed.length === 0) {
          return [];
        }
        query.where('fv.fairsId IN (:...fairIds)', { fairIds: allowed });
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
      const allowed = user.fairIds ?? [];

      if (fairId) {
        if (!allowed.includes(fairId)) {
          return {
            data: [],
            meta: {
              total: 0,
              page,
              limit,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            },
          };
        }
        query.where('fv.fairsId = :fairId', { fairId });
      } else {
        if (allowed.length === 0) {
          return {
            data: [],
            meta: {
              total: 0,
              page,
              limit,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            },
          };
        }
        query.where('fv.fairsId IN (:...fairIds)', { fairIds: allowed });
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
      const allowed = user.fairIds ?? [];

      if (fairId) {
        if (!allowed.includes(fairId)) {
          return { total: 0, recent: 0, companies: 0 };
        }
        query.where('fv.fairsId = :fairId', { fairId });
      } else {
        if (allowed.length === 0) {
          return { total: 0, recent: 0, companies: 0 };
        }
        query.where('fv.fairsId IN (:...fairIds)', { fairIds: allowed });
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const companiesResult = await companiesQuery
      .select('COUNT(DISTINCT visitor.company)', 'companies')
      .andWhere('visitor.company IS NOT NULL')
      .andWhere('visitor.company != :empty', { empty: '' })
      .getRawOne();

    return {
      total,
      recent,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      companies: Number.parseInt(String(companiesResult?.companies || '0')),
      recentPercentage: total > 0 ? Math.round((recent / total) * 100) : 0,
    };
  }

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
      savedVisitor = await this.visitorRepository.save(newVisitor);
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
}
