import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fair } from 'src/modules/fairs/entity/fair.entity';
import { HowDidYouKnow } from './how-did-you-know.entity';
import { CreateHowDidYouKnowDto } from './howDidYouKnow.dto';

@Injectable()
export class HowDidYouKnowService {
  constructor(
    @InjectRepository(HowDidYouKnow)
    private readonly howDidYouKnowRepository: Repository<HowDidYouKnow>,
    @InjectRepository(Fair)
    private readonly fairRepository: Repository<Fair>,
  ) {}

  async create(data: CreateHowDidYouKnowDto) {
    const fair = await this.fairRepository.findOne({
      where: { id: data.fairId },
    });
    if (!fair) {
      throw new Error('Fair not found');
    }

    const record = this.howDidYouKnowRepository.create({
      name: data.name,
      fair,
    });
    return this.howDidYouKnowRepository.save(record);
  }

  async getAllByFair(fairId: string) {
    return this.howDidYouKnowRepository.find({
      where: { fair: { id: fairId } },
    });
  }
}
