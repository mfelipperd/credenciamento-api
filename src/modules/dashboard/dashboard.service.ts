import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visitor } from '../visitors/entities/visitor.entity';
import { CheckIn } from '../checkins/entity/checkins.entity';
import { Fair } from '../fairs/entity/fair.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Visitor)
    private readonly visitorsRepository: Repository<Visitor>,

    @InjectRepository(CheckIn)
    private readonly checkInsRepository: Repository<CheckIn>,
    @InjectRepository(Fair)
    private readonly fairsRepository: Repository<Fair>,
  ) {}

  async getOverview(fairId: string) {
    if (!fairId) {
      throw new BadRequestException('Fair ID is required');
    }

    // Verifica se a feira existe
    const fair = await this.fairsRepository.findOne({ where: { id: fairId } });
    if (!fair) {
      throw new BadRequestException('Invalid fair ID');
    }
    try {
      const totalVisitors = await this.visitorsRepository
        .createQueryBuilder('visitor')
        .innerJoin(
          'fair_visitor',
          'fv',
          'fv.visitorsRegistrationCode = visitor.registrationCode',
        ) // ✅ Relacionando corretamente
        .where('fv.fairsId = :fairId', { fairId }) // ✅ Nome correto da coluna
        .getCount();

      // ✅ Ajustando a query para contar os check-ins corretamente
      const totalCheckIns = await this.checkInsRepository
        .createQueryBuilder('checkin')
        .innerJoin('checkin.visitor', 'visitor')
        .innerJoin(
          'fair_visitor',
          'fv',
          'fv.visitorsRegistrationCode = visitor.registrationCode',
        ) // ✅ Relacionando corretamente
        .where('fv.fairsId = :fairId', { fairId }) // ✅ Nome correto da coluna
        .getCount();

      return {
        fairId,
        totalVisitors,
        totalCheckIns,
      };
    } catch (e) {
      console.log(e);
    }
  }

  async getAbsentVisitors(fairId: string) {
    if (!fairId) {
      throw new BadRequestException('Fair ID is required');
    }

    const fairExists = await this.fairsRepository.findOne({
      where: { id: fairId },
    });
    if (!fairExists) {
      throw new BadRequestException('Invalid fair ID');
    }

    const absentVisitors = await this.visitorsRepository
      .createQueryBuilder('visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      )
      .leftJoin(
        'checkins',
        'c',
        'c.visitorRegistrationCode = visitor.registrationCode',
      )
      .where('fv.fairsId = :fairId', { fairId })
      .andWhere('c.id IS NULL') // ✅ Filtra apenas os que **NÃO** têm check-in registrado
      .select([
        'visitor.registrationCode',
        'visitor.name',
        'visitor.email',
        'visitor.company',
      ])
      .getMany();

    return {
      fairId,
      absentVisitors,
    };
  }

  async getTopFrequentVisitors(fairId: string) {
    if (!fairId) {
      throw new BadRequestException('Fair ID is required');
    }

    const topVisitors = await this.checkInsRepository
      .createQueryBuilder('checkin')
      .innerJoin('checkin.visitor', 'visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      )
      .where('fv.fairsId = :fairId', { fairId })
      .select([
        'visitor.registrationCode',
        'visitor.name',
        'visitor.email',
        'visitor.company',
        'COUNT(checkin.id) AS checkInCount',
      ])
      .groupBy('visitor.registrationCode')
      .orderBy('checkInCount', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      fairId,
      topVisitors,
    };
  }

  async getCheckinsToday(fairId: string) {
    if (!fairId) {
      throw new BadRequestException('Fair ID is required');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // ✅ Define o horário para o início do dia

    const totalCheckInsToday = await this.checkInsRepository
      .createQueryBuilder('checkin')
      .innerJoin('checkin.visitor', 'visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      )
      .where('fv.fairsId = :fairId', { fairId })
      .andWhere('checkin.createdAt >= :today', { today }) // ✅ Filtra apenas os check-ins de hoje
      .getCount();

    return {
      fairId,
      totalCheckInsToday,
    };
  }

  async getTotalVisitors(fairId: string) {
    if (!fairId) {
      throw new BadRequestException('Fair ID is required');
    }

    const totalVisitors = await this.visitorsRepository
      .createQueryBuilder('visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      )
      .where('fv.fairsId = :fairId', { fairId })
      .getCount();

    return {
      fairId,
      totalVisitors,
    };
  }

  async getCheckedInVisitors(fairId: string) {
    if (!fairId) {
      throw new BadRequestException('Fair ID is required');
    }

    const checkedInVisitors = await this.visitorsRepository
      .createQueryBuilder('visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      )
      .innerJoin(
        'checkins',
        'checkin',
        'checkin.visitorRegistrationCode = visitor.registrationCode',
      )
      .where('fv.fairsId = :fairId', { fairId })
      .groupBy('visitor.registrationCode')
      .getCount();

    return {
      fairId,
      checkedInVisitors,
    };
  }

  async getVisitorsByCategory(fairId: string) {
    if (!fairId) {
      throw new BadRequestException('Fair ID is required');
    }

    const visitorsByCategory = await this.visitorsRepository
      .createQueryBuilder('visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      )
      .where('fv.fairsId = :fairId', { fairId })
      .select(['visitor.category', 'COUNT(visitor.registrationCode) AS count'])
      .groupBy('visitor.category')
      .getRawMany();

    return {
      fairId,
      visitorsByCategory,
    };
  }

  async getVisitorsByOrigin(fairId: string) {
    if (!fairId) {
      throw new BadRequestException('Fair ID is required');
    }

    const visitorsByOrigin = await this.visitorsRepository
      .createQueryBuilder('visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      )
      .where('fv.fairsId = :fairId', { fairId })
      .select([
        'visitor.howDidYouKnow AS origin',
        'COUNT(visitor.registrationCode) AS count',
      ])
      .groupBy('visitor.howDidYouKnow')
      .getRawMany();

    return {
      fairId,
      visitorsByOrigin,
    };
  }

  async getVisitorsBySectors(fairId: string) {
    if (!fairId) {
      throw new BadRequestException('Fair ID is required');
    }

    const raw = (await this.visitorsRepository.query(
      `
    SELECT
      sector,
      COUNT(*)::INT AS count
    FROM (
      SELECT
        unnest(string_to_array(visitor.sectors, ',')) AS sector
      FROM visitor
      INNER JOIN fair_visitor fv
        ON fv.visitorsRegistrationCode = visitor.registrationCode
      WHERE fv.fairsId = $1
    ) AS exploded
    WHERE sector <> ''            -- opcional: ignora valores vazios
    GROUP BY sector
    ORDER BY count DESC
    `,
      [fairId],
    )) as { sector: string; count: number }[];

    return {
      fairId,
      visitorsBySectors: raw,
    };
  }
}
