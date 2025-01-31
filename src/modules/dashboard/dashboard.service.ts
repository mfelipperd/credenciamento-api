import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visitor } from '../visitors/entities/visitor.entity';
import { CheckIn } from '../checkins/entity/checkins.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Visitor)
    private readonly visitorsRepository: Repository<Visitor>,

    @InjectRepository(CheckIn)
    private readonly checkInsRepository: Repository<CheckIn>,
  ) {}

  async getOverview() {
    const totalVisitors = await this.visitorsRepository.count();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkedInToday = await this.checkInsRepository.count({
      where: { checkInDate: today.toISOString().split('T')[0] },
    });

    const absentVisitors = totalVisitors - checkedInToday;

    const checkInByHour = (await this.checkInsRepository
      .createQueryBuilder('checkin')
      .select(
        "DATE_FORMAT(checkin.checkInDate, '%H:00') as hour, COUNT(*) as count",
      )
      .groupBy('hour')
      .orderBy('count', 'DESC')
      .limit(1)
      .getRawOne()) as { hour: string; count: number };

    const peakCheckInHour = checkInByHour
      ? `${checkInByHour.hour}:00`
      : 'No check-ins today';

    return {
      totalVisitors,
      checkedInToday,
      absentVisitors,
      peakCheckInHour,
    };
  }

  async getAbsentVisitors() {
    const visitors = await this.visitorsRepository.find();

    const absentVisitors = await Promise.all(
      visitors.map(async (visitor) => {
        const hasCheckIn = await this.checkInsRepository.findOne({
          where: { visitor: { registrationCode: visitor.registrationCode } },
        });

        return hasCheckIn ? null : visitor;
      }),
    );

    return absentVisitors.filter((visitor) => visitor !== null);
  }

  async getTopFrequentVisitors() {
    const topVisitors = await this.checkInsRepository
      .createQueryBuilder('checkin')
      .innerJoinAndSelect('checkin.visitor', 'visitor')
      .select('visitor.registrationCode', 'registrationCode')
      .addSelect('visitor.name', 'name')
      .addSelect('visitor.email', 'email')
      .addSelect('visitor.company', 'company')
      .addSelect('visitor.category', 'category')
      .addSelect('COUNT(checkin.id)', 'checkInCount')
      .groupBy('visitor.registrationCode')
      .orderBy('checkInCount', 'DESC')
      .limit(10)
      .getRawMany();

    return topVisitors as {
      registrationCode: string;
      name: string;
      email: string;
      company: string;
      category: string;
      checkInCount: number;
    }[];
  }

  async getCheckInsToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkedInToday = await this.checkInsRepository.count({
      where: { checkInDate: today.toISOString().split('T')[0] },
    });

    return { checkedInToday };
  }

  async getTotalVisitors() {
    const totalVisitors = await this.visitorsRepository.count();
    return { totalVisitors };
  }

  async getCheckedInVisitors() {
    // Contar visitantes distintos que têm pelo menos um check-in
    const checkedInVisitors = await this.checkInsRepository
      .createQueryBuilder('checkin')
      .select(
        'COUNT(DISTINCT checkin.visitorRegistrationCode)',
        'totalCheckedIn',
      )
      .getRawOne<{ totalCheckedIn: string }>();

    return {
      totalCheckedIn: parseInt(checkedInVisitors?.totalCheckedIn ?? '0', 10),
    };
  }

  async getVisitorsByCategory() {
    const visitorsByCategory = await this.visitorsRepository
      .createQueryBuilder('visitor')
      .select('visitor.category', 'category')
      .addSelect('COUNT(visitor.registrationCode)', 'count')
      .groupBy('visitor.category')
      .getRawMany();

    return visitorsByCategory.reduce<Record<string, number>>(
      (acc, row: { category: string; count: string }) => {
        acc[row.category] = parseInt(row.count, 10);
        return acc;
      },
      {},
    );
  }

  async getVisitorsByOrigin() {
    const visitorsByOrigin = await this.visitorsRepository
      .createQueryBuilder('visitor')
      .select('visitor.howDidYouKnow', 'origin')
      .addSelect('COUNT(visitor.registrationCode)', 'count')
      .groupBy('visitor.howDidYouKnow')
      .getRawMany();

    return visitorsByOrigin.reduce<Record<string, number>>(
      (acc, row: { origin: string; count: string }) => {
        acc[row.origin] = parseInt(row.count, 10);
        return acc;
      },
      {},
    );
  }

  async getVisitorsBySector() {
    const visitorsBySector = await this.visitorsRepository
      .createQueryBuilder('visitor')
      .select('visitor.sectors', 'sector')
      .addSelect('COUNT(visitor.registrationCode)', 'count')
      .groupBy('visitor.sectors')
      .getRawMany();

    return visitorsBySector.reduce<Record<string, number>>(
      (acc, row: { sector: string; count: string }) => {
        acc[row.sector] = parseInt(row.count, 10);
        return acc;
      },
      {},
    );
  }
}
