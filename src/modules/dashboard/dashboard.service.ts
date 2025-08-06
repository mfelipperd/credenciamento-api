import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visitor } from '../visitors/entities/visitor.entity';
import { CheckIn } from '../checkins/entity/checkins.entity';
import { Fair } from '../fairs/entity/fair.entity';

interface ConversionQueryResult {
  howDidYouKnow: string;
  visitorCount: string;
  checkInsCount: string;
}

interface TotalQueryResult {
  howDidYouKnow: string;
  totalVisitors: string;
}

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
    try {
      // Criamos um JSON array a partir da string CSV:
      // ex: "A,B,C" → '["A","B","C"]'
      const raw = (await this.visitorsRepository.query(
        `
    SELECT
      jt.sector,
      COUNT(*) AS count
    FROM \`visitors\` v
    INNER JOIN \`fair_visitor\` fv
      ON fv.visitorsRegistrationCode = v.registrationCode
    CROSS JOIN JSON_TABLE(
      CONCAT('["', REPLACE(v.sectors, ',', '","'), '"]'),
      '$[*]' COLUMNS (
        sector VARCHAR(100) PATH '$'
      )
    ) AS jt
    WHERE fv.fairsId = ?
      AND jt.sector <> ''
    GROUP BY jt.sector
    ORDER BY count DESC;
    `,
        [fairId],
      )) as { sector: string; count: number }[];

      return {
        fairId,
        visitorsBySectors: raw,
      };
    } catch (error) {
      console.error('Error fetching visitors by sectors:', error);
      throw new BadRequestException('Failed to fetch visitors by sectors');
    }
  }

  async getConversionsByHowDidYouKnow(fairId: string) {
    if (!fairId) {
      throw new BadRequestException('Fair ID is required');
    }

    // Verifica se a feira existe
    const fair = await this.fairsRepository.findOne({ where: { id: fairId } });
    if (!fair) {
      throw new BadRequestException('Invalid fair ID');
    }

    try {
      // Busca conversões: quantos visitantes de cada "howDidYouKnow" realmente fizeram check-in
      const conversions: ConversionQueryResult[] = await this.visitorsRepository
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
        .select([
          'visitor.howDidYouKnow AS howDidYouKnow',
          'COUNT(DISTINCT visitor.registrationCode) AS visitorCount',
          'COUNT(checkin.id) AS checkInsCount',
        ])
        .groupBy('visitor.howDidYouKnow')
        .orderBy('checkInsCount', 'DESC')
        .getRawMany();

      // Busca total de visitantes registrados por "howDidYouKnow" para calcular taxa de conversão
      const totalsByHowDidYouKnow: TotalQueryResult[] =
        await this.visitorsRepository
          .createQueryBuilder('visitor')
          .innerJoin(
            'fair_visitor',
            'fv',
            'fv.visitorsRegistrationCode = visitor.registrationCode',
          )
          .where('fv.fairsId = :fairId', { fairId })
          .select([
            'visitor.howDidYouKnow AS howDidYouKnow',
            'COUNT(visitor.registrationCode) AS totalVisitors',
          ])
          .groupBy('visitor.howDidYouKnow')
          .getRawMany();

      // Combina os dados para calcular taxas de conversão
      const conversionData = conversions.map((conversion) => {
        const total = totalsByHowDidYouKnow.find(
          (total) => total.howDidYouKnow === conversion.howDidYouKnow,
        );
        const totalVisitors = parseInt(total?.totalVisitors || '0');
        const visitorCount = parseInt(conversion.visitorCount);
        const checkInsCount = parseInt(conversion.checkInsCount);
        const conversionRate =
          totalVisitors > 0 ? (visitorCount / totalVisitors) * 100 : 0;

        return {
          howDidYouKnow: conversion.howDidYouKnow,
          totalRegistered: totalVisitors,
          visitorsWithCheckins: visitorCount,
          totalCheckIns: checkInsCount,
          conversionRate: Math.round(conversionRate * 100) / 100, // arredonda para 2 casas decimais
        };
      });

      // Adiciona entradas para "howDidYouKnow" que têm registros mas nenhum check-in
      totalsByHowDidYouKnow.forEach((total) => {
        const exists = conversionData.find(
          (conv) => conv.howDidYouKnow === total.howDidYouKnow,
        );
        if (!exists) {
          conversionData.push({
            howDidYouKnow: total.howDidYouKnow,
            totalRegistered: parseInt(total.totalVisitors),
            visitorsWithCheckins: 0,
            totalCheckIns: 0,
            conversionRate: 0,
          });
        }
      });

      // Ordena por número de visitantes únicos que fizeram check-in (impacto real)
      conversionData.sort(
        (a, b) => b.visitorsWithCheckins - a.visitorsWithCheckins,
      );

      return {
        fairId,
        conversions: conversionData,
      };
    } catch (error) {
      console.error('Error fetching conversions by howDidYouKnow:', error);
      throw new BadRequestException('Failed to fetch conversions data');
    }
  }
}
