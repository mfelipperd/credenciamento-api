import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fair } from 'src/modules/fairs/entity/fair.entity';
import { Category } from './entity/categories.entity';
import { CreateCategoryDto } from './categories.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Fair)
    private readonly fairRepository: Repository<Fair>,
  ) {}

  async createCategory(data: CreateCategoryDto) {
    const fair = await this.fairRepository.findOne({
      where: { id: data.fairId },
    });
    if (!fair) {
      throw new Error('Fair not found');
    }

    const category = this.categoryRepository.create({ name: data.name, fair });
    return this.categoryRepository.save(category);
  }

  async getCategoriesByFair(fairId: string) {
    return this.categoryRepository.find({ where: { fair: { id: fairId } } });
  }
}
