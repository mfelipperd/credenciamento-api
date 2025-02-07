import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fair } from 'src/modules/fairs/entity/fair.entity';
import { Sector } from './sectors.entity';
import { CreateSectorDto } from './sector.dto';

@Injectable()
export class SectorsService {
  constructor(
    @InjectRepository(Sector)
    private readonly sectorsRepository: Repository<Sector>,
    @InjectRepository(Fair)
    private readonly fairRepository: Repository<Fair>,
  ) {}

  async createSector(data: CreateSectorDto) {
    const fair = await this.fairRepository.findOne({
      where: { id: data.fairId },
    });
    if (!fair) {
      throw new Error('Fair not found');
    }

    const sector = this.sectorsRepository.create({ name: data.name, fair });
    return this.sectorsRepository.save(sector);
  }

  async getSectorsByFair(fairId: string) {
    return this.sectorsRepository.find({ where: { fair: { id: fairId } } });
  }

  async getSectorById(id: string) {
    return this.sectorsRepository.findOne({ where: { id } });
  }

  async updateSector(id: string, data: Partial<CreateSectorDto>) {
    await this.sectorsRepository.update(id, data);
    return this.getSectorById(id);
  }

  async deleteSector(id: string) {
    return this.sectorsRepository.delete(id);
  }
}
