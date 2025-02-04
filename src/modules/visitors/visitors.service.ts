import { Injectable } from '@nestjs/common';
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

  getVisitors() {
    return this.visitorRepository.find();
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
}
