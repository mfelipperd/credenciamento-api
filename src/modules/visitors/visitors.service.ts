import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Visitor } from './entities/visitor.entity';
import { Repository } from 'typeorm';
import { CreateVisitorInputDto } from './visitors.dto';
import { EmailsService } from '../emails/emails.service';
import { User } from '../users/entitie/users.entity';

@Injectable()
export class VisitorsService {
  constructor(
    @InjectRepository(Visitor) private visitorRepository: Repository<Visitor>,
    @InjectRepository(User) private userRepository: Repository<User>,
    private readonly emailsService: EmailsService,
  ) {}

  async getVisitors(fairId?: string) {
    const query = this.visitorRepository.createQueryBuilder('visitor');

    if (fairId) {
      query
        .innerJoin(
          'fair_visitor',
          'fv',
          'fv.visitorsRegistrationCode = visitor.registrationCode',
        )
        .where('fv.fairsId = :fairId', { fairId });
    }

    return await query.getMany();
  }

  async createVisitor(visitor: CreateVisitorInputDto, userId?: string) {
    let createdByUser: User | null = null;
    if (userId) {
      createdByUser = await this.userRepository.findOne({
        where: { id: Number(userId) },
      });
    }

    const newVisitor = this.visitorRepository.create({
      ...visitor,
      createdBy: createdByUser || undefined,
      fair_visitor: [{ id: visitor.fair_visitor }],
    });

    const result = await this.visitorRepository.save(newVisitor);

    if (result) {
      await this.emailsService.sendEmail(
        visitor.email,
        visitor.name,
        visitor.registrationCode,
      );
    }

    return result;
  }

  getVisitor(id: number) {
    return this.visitorRepository.findOne({
      where: { registrationCode: id.toString() },
    });
  }

  updateVisitor(id: number, visitor: Visitor) {
    return this.visitorRepository.update(id, visitor);
  }

  async getVisitorByRegistrationCode(registrationCode: string, fairId: string) {
    if (!fairId) {
      throw new BadRequestException('Fair ID is required');
    }

    const visitor = await this.visitorRepository
      .createQueryBuilder('visitor')
      .innerJoin(
        'fair_visitor',
        'fv',
        'fv.visitorsRegistrationCode = visitor.registrationCode',
      )
      .where('visitor.registrationCode = :registrationCode', {
        registrationCode,
      })
      .andWhere('fv.fairsId = :fairId', { fairId }) // ✅ Filtrando pela feira
      .getOne();

    if (!visitor) {
      throw new NotFoundException('Visitor not found for the specified fair');
    }

    return visitor;
  }
}
