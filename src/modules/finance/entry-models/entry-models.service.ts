import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntryModel } from './entities/entry-model.entity';
import { CreateEntryModelDto, UpdateEntryModelDto } from './entry-models.dto';
import { EntryModelType } from '../common/enums/finance.enums';

@Injectable()
export class EntryModelsService {
  constructor(
    @InjectRepository(EntryModel)
    private readonly entryModelRepository: Repository<EntryModel>,
  ) {}

  async create(createEntryModelDto: CreateEntryModelDto): Promise<EntryModel> {
    const entryModel = this.entryModelRepository.create(createEntryModelDto);
    return await this.entryModelRepository.save(entryModel);
  }

  async findAll(): Promise<EntryModel[]> {
    return await this.entryModelRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<EntryModel> {
    const entryModel = await this.entryModelRepository.findOne({
      where: { id },
    });

    if (!entryModel) {
      throw new NotFoundException(
        `Modelo de lançamento com ID ${id} não encontrado`,
      );
    }

    return entryModel;
  }

  async update(
    id: string,
    updateEntryModelDto: UpdateEntryModelDto,
  ): Promise<EntryModel> {
    const entryModel = await this.findOne(id);

    Object.assign(entryModel, updateEntryModelDto);

    return await this.entryModelRepository.save(entryModel);
  }

  async remove(id: string): Promise<void> {
    const entryModel = await this.findOne(id);
    await this.entryModelRepository.remove(entryModel);
  }

  async findByType(type: string): Promise<EntryModel[]> {
    return await this.entryModelRepository.find({
      where: { type: type as EntryModelType },
      order: { name: 'ASC' },
    });
  }
}
