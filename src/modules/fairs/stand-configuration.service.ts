import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StandConfiguration } from './entity/stand-configuration.entity';
import { CreateStandConfigurationDto } from './dto/create-stand-configuration.dto';
import { UpdateStandConfigurationDto } from './dto/update-stand-configuration.dto';
import { StandConfigurationResponseDto } from './dto/stand-configuration-response.dto';
import { EntryModelsService } from '../finance/entry-models/entry-models.service';
import { EntryModel } from '../finance/entry-models/entities/entry-model.entity';
import { EntryModelType } from '../finance/common/enums/finance.enums';

export type EntryModelLinkOutcome =
  | 'already_linked'
  | 'linked_existing'
  | 'created';

@Injectable()
export class StandConfigurationService {
  private readonly logger = new Logger(StandConfigurationService.name);

  constructor(
    @InjectRepository(StandConfiguration)
    private standConfigRepository: Repository<StandConfiguration>,
    private readonly entryModelsService: EntryModelsService,
  ) {}

  async create(
    createDto: CreateStandConfigurationDto,
    fairId: string,
  ): Promise<StandConfigurationResponseDto> {
    // Verificar se já existe configuração com mesmo nome para esta feira
    const existingConfig = await this.standConfigRepository.findOne({
      where: { fairId, name: createDto.name },
    });

    if (existingConfig) {
      throw new ConflictException(
        'Já existe uma configuração de stand com este nome para esta feira',
      );
    }

    const area = createDto.width * createDto.height;
    const totalPrice = area * createDto.pricePerSquareMeter;
    const totalSetupCost = area * createDto.setupCostPerSquareMeter;
    const profitPerStand = totalPrice - totalSetupCost;
    const profitMargin =
      totalPrice > 0 ? (profitPerStand / totalPrice) * 100 : 0;

    const standConfig = this.standConfigRepository.create({
      ...createDto,
      fairId,
      totalPrice,
      totalSetupCost,
      profitPerStand,
      profitMargin,
      isActive: createDto.isActive ?? true,
    });

    const savedConfig = await this.standConfigRepository.save(standConfig);
    this.logger.log(
      `Configuração de stand criada: ${savedConfig.name} para feira ${fairId}`,
    );

    return this.mapToResponseDto(savedConfig);
  }

  async findAllByFair(
    fairId: string,
  ): Promise<StandConfigurationResponseDto[]> {
    const configs = await this.standConfigRepository.find({
      where: { fairId },
      order: { createdAt: 'DESC' },
    });

    return configs.map((config) => this.mapToResponseDto(config));
  }

  async findOne(id: string): Promise<StandConfigurationResponseDto> {
    const config = await this.standConfigRepository.findOne({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('Configuração de stand não encontrada');
    }

    return this.mapToResponseDto(config);
  }

  async update(
    id: string,
    updateDto: UpdateStandConfigurationDto,
  ): Promise<StandConfigurationResponseDto> {
    const config = await this.standConfigRepository.findOne({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('Configuração de stand não encontrada');
    }

    // Verificar nome único se estiver sendo alterado
    if (updateDto.name && updateDto.name !== config.name) {
      const existingConfig = await this.standConfigRepository.findOne({
        where: { fairId: config.fairId, name: updateDto.name },
      });

      if (existingConfig) {
        throw new ConflictException(
          'Já existe uma configuração de stand com este nome para esta feira',
        );
      }
    }

    // Recalcular valores se dimensões ou preços foram alterados
    if (
      updateDto.width ||
      updateDto.height ||
      updateDto.pricePerSquareMeter ||
      updateDto.setupCostPerSquareMeter
    ) {
      const width = updateDto.width ?? config.width;
      const height = updateDto.height ?? config.height;
      const pricePerSquareMeter =
        updateDto.pricePerSquareMeter ?? config.pricePerSquareMeter;
      const setupCostPerSquareMeter =
        updateDto.setupCostPerSquareMeter ?? config.setupCostPerSquareMeter;

      const area = width * height;
      const totalPrice = area * pricePerSquareMeter;
      const totalSetupCost = area * setupCostPerSquareMeter;
      const profitPerStand = totalPrice - totalSetupCost;
      const profitMargin =
        totalPrice > 0 ? (profitPerStand / totalPrice) * 100 : 0;

      // Atualizar os campos calculados diretamente no objeto
      config.totalPrice = totalPrice;
      config.totalSetupCost = totalSetupCost;
      config.profitPerStand = profitPerStand;
      config.profitMargin = profitMargin;
    }

    Object.assign(config, updateDto);
    const savedConfig = await this.standConfigRepository.save(config);

    this.logger.log(`Configuração de stand atualizada: ${savedConfig.name}`);
    return this.mapToResponseDto(savedConfig);
  }

  async remove(id: string): Promise<void> {
    const config = await this.standConfigRepository.findOne({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('Configuração de stand não encontrada');
    }

    await this.standConfigRepository.remove(config);
    this.logger.log(`Configuração de stand removida: ${config.name}`);
  }

  async toggleActive(id: string): Promise<StandConfigurationResponseDto> {
    const config = await this.standConfigRepository.findOne({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('Configuração de stand não encontrada');
    }

    config.isActive = !config.isActive;
    const savedConfig = await this.standConfigRepository.save(config);

    this.logger.log(
      `Status da configuração alterado: ${savedConfig.name} -> ${savedConfig.isActive ? 'Ativo' : 'Inativo'}`,
    );
    return this.mapToResponseDto(savedConfig);
  }

  /**
   * Vincula o tipo de stand a um modelo de lançamento financeiro já existente.
   * É esse vínculo que permite gerar a receita automaticamente quando uma
   * reserva online é paga.
   */
  async linkEntryModel(
    id: string,
    entryModelId: string,
  ): Promise<StandConfigurationResponseDto> {
    const config = await this.findEntityOrFail(id);
    const entryModel = await this.entryModelsService.findOne(entryModelId);

    if (entryModel.fairId !== config.fairId) {
      throw new BadRequestException(
        'O modelo de lançamento pertence a outra feira',
      );
    }
    if (entryModel.type !== EntryModelType.STAND) {
      throw new BadRequestException(
        'Só modelos de lançamento do tipo STAND podem ser vinculados a um tipo de stand',
      );
    }
    if (!entryModel.active) {
      throw new BadRequestException('O modelo de lançamento está inativo');
    }

    config.entryModelId = entryModel.id;
    const savedConfig = await this.standConfigRepository.save(config);

    this.logger.log(
      `Tipo de stand ${savedConfig.name} vinculado ao modelo de lançamento ${entryModel.id}`,
    );
    return this.mapToResponseDto(savedConfig);
  }

  /**
   * Vincula o tipo de stand ao modelo de lançamento STAND ativo da mesma feira
   * com o mesmo nome; se não houver, cria um a partir do próprio tipo (preço
   * total e custo de montagem, em centavos).
   */
  async linkMatchingEntryModel(id: string): Promise<{
    standConfiguration: StandConfigurationResponseDto;
    entryModel: EntryModel;
    outcome: EntryModelLinkOutcome;
  }> {
    const config = await this.findEntityOrFail(id);

    if (config.entryModelId) {
      return {
        standConfiguration: this.mapToResponseDto(config),
        entryModel: await this.entryModelsService.findOne(config.entryModelId),
        outcome: 'already_linked',
      };
    }

    const normalize = (value: string) => value.trim().toLowerCase();
    const sameFairModels = await this.entryModelsService.findByType(
      EntryModelType.STAND,
      config.fairId,
    );
    const existing = sameFairModels.find(
      (model) => normalize(model.name) === normalize(config.name),
    );

    const entryModel =
      existing ??
      (await this.entryModelsService.create({
        fairId: config.fairId,
        name: config.name,
        type: EntryModelType.STAND,
        baseValue: Math.round(Number(config.totalPrice) * 100),
        costCents: Math.round(Number(config.totalSetupCost) * 100),
      }));

    config.entryModelId = entryModel.id;
    const savedConfig = await this.standConfigRepository.save(config);

    this.logger.log(
      `Tipo de stand ${savedConfig.name} vinculado ao modelo de lançamento ${entryModel.id} (${existing ? 'existente' : 'criado'})`,
    );
    return {
      standConfiguration: this.mapToResponseDto(savedConfig),
      entryModel,
      outcome: existing ? 'linked_existing' : 'created',
    };
  }

  private async findEntityOrFail(id: string): Promise<StandConfiguration> {
    const config = await this.standConfigRepository.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException('Configuração de stand não encontrada');
    }
    return config;
  }

  async getStandStatistics(fairId: string): Promise<any> {
    const configs = await this.standConfigRepository.find({
      where: { fairId, isActive: true },
    });

    if (configs.length === 0) {
      return {
        totalConfigurations: 0,
        totalStands: 0,
        totalArea: 0,
        averagePricePerSquareMeter: 0,
        averageProfitMargin: 0,
        mostProfitable: null,
        leastProfitable: null,
      };
    }

    const totalStands = configs.reduce(
      (sum, config) => sum + config.quantity,
      0,
    );
    const totalArea = configs.reduce(
      (sum, config) => sum + config.width * config.height * config.quantity,
      0,
    );
    const averagePricePerSquareMeter =
      configs.reduce((sum, config) => sum + config.pricePerSquareMeter, 0) /
      configs.length;
    const averageProfitMargin =
      configs.reduce((sum, config) => sum + config.profitMargin, 0) /
      configs.length;

    const mostProfitable = configs.reduce((max, current) =>
      current.profitMargin > max.profitMargin ? current : max,
    );

    const leastProfitable = configs.reduce((min, current) =>
      current.profitMargin < min.profitMargin ? current : min,
    );

    return {
      totalConfigurations: configs.length,
      totalStands,
      totalArea,
      averagePricePerSquareMeter,
      averageProfitMargin,
      mostProfitable: this.mapToResponseDto(mostProfitable),
      leastProfitable: this.mapToResponseDto(leastProfitable),
    };
  }

  private mapToResponseDto(
    config: StandConfiguration,
  ): StandConfigurationResponseDto {
    return {
      id: config.id,
      fairId: config.fairId,
      name: config.name,
      width: config.width,
      height: config.height,
      quantity: config.quantity,
      pricePerSquareMeter: config.pricePerSquareMeter,
      setupCostPerSquareMeter: config.setupCostPerSquareMeter,
      totalPrice: config.totalPrice,
      anchorPrice: config.anchorPrice,
      totalSetupCost: config.totalSetupCost,
      profitPerStand: config.profitPerStand,
      profitMargin: config.profitMargin,
      description: config.description,
      entryModelId: config.entryModelId,
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}
