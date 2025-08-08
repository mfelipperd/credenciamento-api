import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Revenue } from './entities/revenue.entity';
import { CreateRevenueDto, UpdateRevenueDto } from './revenues.dto';
import { RevenueStatus } from '../common/enums/finance.enums';

@Injectable()
export class RevenuesService {
  constructor(
    @InjectRepository(Revenue)
    private readonly revenueRepository: Repository<Revenue>,
  ) {}

  async create(createRevenueDto: CreateRevenueDto): Promise<Revenue> {
    const revenue = this.revenueRepository.create(createRevenueDto);
    return await this.revenueRepository.save(revenue);
  }

  async findAll(): Promise<Revenue[]> {
    return await this.revenueRepository.find({
      relations: ['client', 'entryModel'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Revenue> {
    const revenue = await this.revenueRepository.findOne({
      where: { id },
      relations: ['client', 'entryModel'],
    });

    if (!revenue) {
      throw new NotFoundException(`Receita com ID ${id} não encontrada`);
    }

    return revenue;
  }

  async update(id: string, updateRevenueDto: UpdateRevenueDto): Promise<Revenue> {
    const revenue = await this.findOne(id);
    
    Object.assign(revenue, updateRevenueDto);
    
    return await this.revenueRepository.save(revenue);
  }

  async remove(id: string): Promise<void> {
    const revenue = await this.findOne(id);
    await this.revenueRepository.remove(revenue);
  }

  async findByClient(clientId: string): Promise<Revenue[]> {
    return await this.revenueRepository.find({
      where: { clientId },
      relations: ['client', 'entryModel'],
      order: { createdAt: 'ASC' },
    });
  }

  async findByStatus(status: string): Promise<Revenue[]> {
    return await this.revenueRepository.find({
      where: { status: status as RevenueStatus },
      relations: ['client', 'entryModel'],
      order: { createdAt: 'ASC' },
    });
  }
}
