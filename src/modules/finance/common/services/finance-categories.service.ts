import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinanceCategory } from '../entities/finance-category.entity';
import { CreateFinanceCategoryDto } from '../dto/create-finance-category.dto';
import { UpdateFinanceCategoryDto } from '../dto/update-finance-category.dto';
import { CategoriesService } from '../../../categories/categories.service';

@Injectable()
export class FinanceCategoriesService {
  constructor(
    @InjectRepository(FinanceCategory)
    private categoriesRepository: Repository<FinanceCategory>,
    private categoriesService: CategoriesService,
  ) {}

  async create(
    createCategoryDto: CreateFinanceCategoryDto,
  ): Promise<FinanceCategory> {
    const category = this.categoriesRepository.create(createCategoryDto);
    return await this.categoriesRepository.save(category);
  }

  async findAll(): Promise<FinanceCategory[]> {
    return await this.categoriesRepository.find({
      relations: ['parent', 'children'],
      order: { nome: 'ASC' },
    });
  }

  async findOne(id: string): Promise<FinanceCategory> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!category) {
      throw new NotFoundException(`Categoria com ID ${id} não encontrada`);
    }

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateFinanceCategoryDto,
  ): Promise<FinanceCategory> {
    const category = await this.findOne(id);

    // Verificar se não está criando um loop de referência pai-filho
    if (updateCategoryDto.parentId && updateCategoryDto.parentId === id) {
      throw new Error('Uma categoria não pode ser pai de si mesma');
    }

    Object.assign(category, updateCategoryDto);
    return await this.categoriesRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);

    // Verificar se há despesas usando esta categoria
    // Se houver, não permitir exclusão

    await this.categoriesRepository.remove(category);
  }

  async findByFair(fairId: string): Promise<FinanceCategory[]> {
    return await this.categoriesRepository.find({
      where: [{ fairId }, { global: true }],
      relations: ['parent', 'children'],
      order: { nome: 'ASC' },
    });
  }

  async findRequiredByFair(fairId: string): Promise<any[]> {
    // Redirecionar para o módulo categories
    return await this.categoriesService.getRequiredCategoriesByFair(fairId);
  }

  async findOptionalByFair(fairId: string): Promise<any[]> {
    // Redirecionar para o módulo categories
    return await this.categoriesService.getOptionalCategoriesByFair(fairId);
  }

  async toggleRequired(id: string): Promise<FinanceCategory> {
    const category = await this.findOne(id);
    category.isRequired = !category.isRequired;
    return await this.categoriesRepository.save(category);
  }

  async getRequiredCategoriesSummary(fairId: string): Promise<any> {
    // Redirecionar para o módulo categories
    return await this.categoriesService.getRequiredCategoriesSummary(fairId);
  }
}
