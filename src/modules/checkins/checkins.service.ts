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

    // ✅ Buscar check-ins apenas da feira específica
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
}
