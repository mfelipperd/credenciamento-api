import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Visitor } from './entities/visitor.entity';
import { Repository } from 'typeorm';
import { CreateVisitorInputDto } from './visitors.dto';
import { EmailsService } from '../emails/emails.service';

@Injectable()
export class VisitorsService {
  constructor(
    @InjectRepository(Visitor) private visitorRepository: Repository<Visitor>,
    private readonly emailsService: EmailsService,
  ) {}

  getVisitors() {
    return this.visitorRepository.find();
  }

  async createVisitor(visitor: CreateVisitorInputDto) {
    const result = await this.visitorRepository.save(visitor);
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
