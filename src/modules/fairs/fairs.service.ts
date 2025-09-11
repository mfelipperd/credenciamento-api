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
    // Extrair configurações de stands do DTO
    const { standConfigurations, ...fairData } = fair;

    const newFair = this.fairRepository.create(fairData);
    const result = await this.fairRepository.save(newFair);

    // As configurações de stands serão criadas separadamente via endpoint específico
    // para manter a separação de responsabilidades

    return result;
  }

  getFairs() {
    return this.fairRepository.find();
  }

  async findOne(id: string): Promise<Fair | null> {
    return this.fairRepository.findOneBy({ id });
  }
}
