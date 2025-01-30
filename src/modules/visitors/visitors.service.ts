import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Visitor } from './entities/visitor.entity';
import { Repository } from 'typeorm';
import { CreateVisitorInputDto } from './visitors.dto';

@Injectable()
export class VisitorsService {
  constructor(
    @InjectRepository(Visitor) private visitorRepository: Repository<Visitor>,
  ) {}

  getVisitors() {
    return this.visitorRepository.find();
  }

  createVisitor(visitor: CreateVisitorInputDto) {
    return this.visitorRepository.save(visitor);
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
