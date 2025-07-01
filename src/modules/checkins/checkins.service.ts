import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visitor } from '../visitors/entities/visitor.entity';
import { CheckIn } from './entity/checkins.entity';

@Injectable()
export class CheckInsService {
  constructor(
    @InjectRepository(CheckIn)
    private readonly checkInsRepository: Repository<CheckIn>,

    @InjectRepository(Visitor)
    private readonly visitorsRepository: Repository<Visitor>,
  ) {}

  async registerCheckIn(registrationCode: string, fairId: string) {
    if (!registrationCode || !fairId) {
      throw new BadRequestException(
        'RegistrationCode and Fair ID are required',
      );
    }

    const visitor = await this.visitorsRepository
      .createQueryBuilder('visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      )
      .where('visitor.registrationCode = :registrationCode', {
        registrationCode,
      })
      .andWhere('fv.fairsId = :fairId', { fairId })
      .getOne();

    if (!visitor) {
      throw new NotFoundException('Visitor not found for this fair');
    }

    const checkIn = this.checkInsRepository.create({
      visitor,
      createdAt: new Date(),
    });

    await this.checkInsRepository.save(checkIn);

    return {
      message: 'Check-in successful',
      visitor: {
        registrationCode: visitor.registrationCode,
        name: visitor.name,
        company: visitor.company,
      },
    };
  }

  async getCheckIns(fairId: string) {
    if (!fairId) {
      throw new BadRequestException('Fair ID is required');
    }

    const checkIns = await this.checkInsRepository
      .createQueryBuilder('checkin')
      .innerJoin('checkin.visitor', 'visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      )
      .where('fv.fairsId = :fairId', { fairId })
      .select([
        'checkin.id',
        'checkin.createdAt',
        'visitor.registrationCode',
        'visitor.name',
        'visitor.company',
      ])
      .getMany();

    return {
      fairId,
      checkIns,
    };
  }

  async getCheckinsPerHour(fairId?: string) {
    let checkins: CheckIn[];

    if (fairId) {
      checkins = await this.checkInsRepository
        .createQueryBuilder('checkin')
        .innerJoinAndSelect('checkin.visitor', 'visitor')
        .innerJoin(
          'fair_visitor',
          'fv',
          'fv.visitorsRegistrationCode = visitor.registrationCode',
        )
        .where('fv.fairsId = :fairId', { fairId })
        .orderBy('checkin.createdAt', 'ASC')
        .getMany();
    } else {
      checkins = await this.checkInsRepository.find({
        relations: ['visitor'],
        order: { createdAt: 'ASC' },
      });
    }

    const hourLabels = Array.from({ length: 14 }, (_, i) => {
      const hour = i + 8;
      return `${hour.toString().padStart(2, '0')}:00`;
    });

    const groupedByDay: Record<string, number[]> = {};

    for (const checkin of checkins) {
      const date = new Date(checkin.createdAt);

      const rawHour = date.getHours();
      const hour = (rawHour - 2 + 24) % 24;

      if (hour < 8 || hour > 21) continue;

      const hourIndex = hour - 8;

      const dayLabel = date.toLocaleDateString('pt-BR');

      if (!groupedByDay[dayLabel]) {
        groupedByDay[dayLabel] = new Array<number>(14).fill(0);
      }
      groupedByDay[dayLabel][hourIndex]++;
    }

    const series = Object.entries(groupedByDay).map(([day, data]) => ({
      name: day,
      data,
    }));

    return {
      hours: hourLabels,
      data: series,
    };
  }
}
