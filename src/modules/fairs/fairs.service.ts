import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Fair } from './entity/fair.entity';
import { Repository } from 'typeorm';
import { CreateInputFairDto } from './fair.dto';
import { UpdateFairDto } from './dto/update-fair.dto';
import { FairResponseDto } from './dto/fair-response.dto';
import { RevenuesService } from '../finance/revenues/revenues.service';
import { ExpensesService } from '../finance/expenses/expenses.service';

@Injectable()
export class FairsService {
  private readonly logger = new Logger(FairsService.name);

  constructor(
    @InjectRepository(Fair) private fairRepository: Repository<Fair>,
    private readonly revenuesService: RevenuesService,
    private readonly expensesService: ExpensesService,
  ) {}

  private async getFinancialData(fairId: string): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    netBalance: number;
    profitMargin: number;
    totalRevenues: number;
    totalExpensesCount: number;
  }> {
    try {
      // Buscar estatísticas de receitas
      const revenueStats = await this.revenuesService.getRevenueStatsByFair(fairId);
      
      // Buscar total de despesas
      const totalExpenses = await this.expensesService.getTotalByFair(fairId);
      
      // Buscar contagem de despesas
      const expenses = await this.expensesService.findAllByFair(fairId);
      const totalExpensesCount = expenses.length;

      const totalRevenue = revenueStats.totalValue;
      const netBalance = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netBalance / totalRevenue) * 100 : 0;

      return {
        totalRevenue,
        totalExpenses,
        netBalance,
        profitMargin: Math.round(profitMargin * 100) / 100, // Arredondar para 2 casas decimais
        totalRevenues: revenueStats.totalRevenues,
        totalExpensesCount,
      };
    } catch (error) {
      this.logger.warn(`Erro ao buscar dados financeiros da feira ${fairId}: ${error.message}`);
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netBalance: 0,
        profitMargin: 0,
        totalRevenues: 0,
        totalExpensesCount: 0,
      };
    }
  }

  async createFair(fair: CreateInputFairDto): Promise<FairResponseDto> {
    this.logger.log(`Criando nova feira: ${fair.name}`);
    
    // Extrair configurações de stands do DTO
    const { standConfigurations, ...fairData } = fair;

    const newFair = this.fairRepository.create(fairData);
    const result = await this.fairRepository.save(newFair);

    this.logger.log(`Feira criada com sucesso: ${result.id}`);

    return new FairResponseDto(result);
  }

  async findAll(): Promise<FairResponseDto[]> {
    this.logger.log('Buscando todas as feiras');
    
    const fairs = await this.fairRepository.find({
      relations: ['standConfigurations'],
      order: { createdAt: 'DESC' }
    });

    // Buscar dados financeiros para cada feira
    const fairsWithFinancialData = await Promise.all(
      fairs.map(async (fair) => {
        const financialData = await this.getFinancialData(fair.id);
        
        // Criar um objeto Fair com os dados financeiros
        const fairWithFinancialData = {
          ...fair,
          ...financialData
        };
        
        return new FairResponseDto(fairWithFinancialData);
      })
    );

    return fairsWithFinancialData;
  }

  async findOne(id: string): Promise<FairResponseDto> {
    this.logger.log(`Buscando feira: ${id}`);
    
    const fair = await this.fairRepository.findOne({
      where: { id },
      relations: ['standConfigurations']
    });

    if (!fair) {
      throw new NotFoundException(`Feira com ID ${id} não encontrada`);
    }

    // Buscar dados financeiros
    const financialData = await this.getFinancialData(fair.id);
    
    // Criar um objeto Fair com os dados financeiros
    const fairWithFinancialData = {
      ...fair,
      ...financialData
    };

    return new FairResponseDto(fairWithFinancialData);
  }

  async update(id: string, updateFairDto: UpdateFairDto): Promise<FairResponseDto> {
    this.logger.log(`Atualizando feira: ${id}`);
    
    const fair = await this.fairRepository.findOne({
      where: { id },
      relations: ['standConfigurations']
    });

    if (!fair) {
      throw new NotFoundException(`Feira com ID ${id} não encontrada`);
    }

    // Atualizar apenas os campos fornecidos
    Object.assign(fair, updateFairDto);

    const updatedFair = await this.fairRepository.save(fair);
    
    this.logger.log(`Feira atualizada com sucesso: ${id}`);

    return new FairResponseDto(updatedFair);
  }

  async remove(id: string): Promise<{ message: string }> {
    this.logger.log(`Removendo feira: ${id}`);
    
    const fair = await this.fairRepository.findOne({
      where: { id }
    });

    if (!fair) {
      throw new NotFoundException(`Feira com ID ${id} não encontrada`);
    }

    await this.fairRepository.remove(fair);
    
    this.logger.log(`Feira removida com sucesso: ${id}`);

    return { message: 'Feira removida com sucesso' };
  }

  async toggleActive(id: string): Promise<FairResponseDto> {
    this.logger.log(`Alternando status ativo da feira: ${id}`);
    
    const fair = await this.fairRepository.findOne({
      where: { id },
      relations: ['standConfigurations']
    });

    if (!fair) {
      throw new NotFoundException(`Feira com ID ${id} não encontrada`);
    }

    fair.isActive = !fair.isActive;
    const updatedFair = await this.fairRepository.save(fair);
    
    this.logger.log(`Status da feira alterado para: ${updatedFair.isActive ? 'ativo' : 'inativo'}`);

    return new FairResponseDto(updatedFair);
  }

  // Método para compatibilidade com código existente
  getFairs() {
    return this.findAll();
  }
}
