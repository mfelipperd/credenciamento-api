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

    const category = this.categoryRepository.create({ 
      name: data.name, 
      fair,
      isRequired: data.isRequired || false,
      description: data.description
    });
    return this.categoryRepository.save(category);
  }

  async getCategoriesByFair(fairId: string) {
    return this.categoryRepository.find({ 
      where: { fair: { id: fairId } },
      relations: ['fair']
    });
  }
  async getCategoryById(id: string) {
    return this.categoryRepository.findOne({ where: { id } });
  }


  async updateCategory(id: string, data: Partial<CreateCategoryDto>) {
    await this.categoryRepository.update(id, data);
    return this.getCategoryById(id);
  }

  async deleteCategory(id: string) {
    return this.categoryRepository.delete(id);
  }

  async getRequiredCategoriesByFair(fairId: string) {
    return this.categoryRepository.find({ 
      where: { 
        fair: { id: fairId },
        isRequired: true 
      },
      relations: ['fair']
    });
  }

  async getOptionalCategoriesByFair(fairId: string) {
    return this.categoryRepository.find({ 
      where: { 
        fair: { id: fairId },
        isRequired: false 
      } 
    });
  }

  async toggleRequired(id: string) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new Error('Category not found');
    }
    
    category.isRequired = !category.isRequired;
    return this.categoryRepository.save(category);
  }

  async getRequiredCategoriesSummary(fairId: string) {
    const requiredCategories = await this.getRequiredCategoriesByFair(fairId);
    
    return {
      totalRequired: requiredCategories.length,
      categories: requiredCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        fairId: cat.fair.id
      }))
    };
  }
}
