import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Fair } from './entity/fair.entity';
import { Repository } from 'typeorm';
import { CreateInputFairDto } from './fair.dto';

@Injectable()
export class FairsService {
  constructor(
    @InjectRepository(Fair) private fairRepository: Repository<Fair>,
  ) {}
  async createFair(fair: CreateInputFairDto) {
    const newFair = this.fairRepository.create({
      ...fair,
    });
    const result = await this.fairRepository.save(newFair);
    return result;
  }

  getFairs() {
    return this.fairRepository.find();
  }
}
