import { Injectable, BadRequestException } from '@nestjs/common';
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

  async registerCheckIn(visitorId?: number, registrationCode?: string) {
    let visitor: Visitor | null = null;

    if (visitorId) {
      visitor = await this.visitorsRepository.findOne({
        where: { registrationCode: visitorId.toString() },
      });
    } else if (registrationCode) {
      visitor = await this.visitorsRepository.findOne({
        where: { registrationCode },
      });
    }

    if (!visitor) {
      throw new BadRequestException('Visitor not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingCheckIn = await this.checkInsRepository.findOne({
      where: {
        visitor,
        checkInDate: today.toISOString().split('T')[0],
      },
    });

    if (existingCheckIn) {
      throw new BadRequestException('Visitor already checked in today');
    }

    // Registra o novo check-in
    const checkIn = this.checkInsRepository.create({
      visitor,
      checkInDate: new Date().toISOString().split('T')[0],
    });

    await this.checkInsRepository.save(checkIn);

    return {
      message: 'Check-in successful',
      checkInTime: checkIn.checkInDate,
    };
  }
}
