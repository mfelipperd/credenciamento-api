import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stand } from './entities/stand.entity';
import { Revenue } from '../revenues/entities/revenue.entity';
import { StandResponseDto, ConfigureFairStandsDto } from './stands.dto';

@Injectable()
export class StandsService {
  constructor(
    @InjectRepository(Stand)
    private readonly standRepository: Repository<Stand>,
    @InjectRepository(Revenue)
    private readonly revenueRepository: Repository<Revenue>,
  ) {}

  async configureFairStands(
    configureFairStandsDto: ConfigureFairStandsDto,
  ): Promise<{ message: string; totalStands: number }> {
    const { fairId, totalStands } = configureFairStandsDto;

    // Verificar quantos stands já existem para esta feira
    const existingStands = await this.standRepository.count({
      where: { fairId },
    });

    if (totalStands < existingStands) {
      // Verificar quantos stands estão ocupados (vendidos)
      const occupiedStands = await this.standRepository.count({
        where: { fairId, isAvailable: false },
      });

      if (totalStands < occupiedStands) {
        throw new BadRequestException(
          `Não é possível reduzir para ${totalStands} stands. Já existem ${occupiedStands} stands vendidos. Mínimo permitido: ${occupiedStands} stands.`,
        );
      }

      // Remover stands disponíveis excedentes (números mais altos)
      await this.standRepository
        .createQueryBuilder()
        .delete()
        .from(Stand)
        .where('fairId = :fairId', { fairId })
        .andWhere('isAvailable = true')
        .andWhere('standNumber > :minStandNumber', {
          minStandNumber: totalStands,
        })
        .execute();
    }

    // Criar stands adicionais se necessário
    if (totalStands > existingStands) {
      const standsToCreate: Partial<Stand>[] = [];
      for (let i = existingStands + 1; i <= totalStands; i++) {
        standsToCreate.push({
          standNumber: i,
          fairId,
          isAvailable: true,
        });
      }

      await this.standRepository.save(standsToCreate);
    }

    return {
      message: `Feira configurada com ${totalStands} stands`,
      totalStands,
    };
  }

  async getFairStands(fairId: string): Promise<StandResponseDto[]> {
    const stands = await this.standRepository
      .createQueryBuilder('stand')
      .leftJoinAndSelect('stand.revenue', 'revenue')
      .leftJoinAndSelect('revenue.client', 'client')
      .leftJoinAndSelect('revenue.entryModel', 'entryModel')
      .where('stand.fairId = :fairId', { fairId })
      .orderBy('stand.standNumber', 'ASC')
      .getMany();

    return stands.map((stand) => ({
      id: stand.id,
      standNumber: stand.standNumber,
      fairId: stand.fairId,
      isAvailable: stand.isAvailable,
      revenueId: stand.revenueId,

      // Dados do cliente (quando stand está ocupado)
      clientName: stand.revenue?.client?.name,
      clientEmail: stand.revenue?.client?.email,
      clientPhone: stand.revenue?.client?.phone,
      clientCnpj: stand.revenue?.client?.cnpj,

      // Dados da receita (quando stand está ocupado)
      revenueStatus: stand.revenue?.status,
      paymentMethod: stand.revenue?.paymentMethod,
      contractValue: stand.revenue?.contractValue,
      numberOfInstallments: stand.revenue?.numberOfInstallments,
      condition: stand.revenue?.condition,
      notes: stand.revenue?.notes,
      revenueCreatedAt: stand.revenue?.createdAt,

      // Dados do entry model
      entryModelName: stand.revenue?.entryModel?.name,
      entryModelBaseValue: stand.revenue?.entryModel?.baseValue,
    }));
  }

  async getStandById(id: number): Promise<StandResponseDto> {
    const stand = await this.standRepository
      .createQueryBuilder('stand')
      .leftJoinAndSelect('stand.revenue', 'revenue')
      .leftJoinAndSelect('revenue.client', 'client')
      .leftJoinAndSelect('revenue.entryModel', 'entryModel')
      .where('stand.id = :id', { id })
      .getOne();

    if (!stand) {
      throw new NotFoundException(`Stand com ID ${id} não encontrado`);
    }

    return {
      id: stand.id,
      standNumber: stand.standNumber,
      fairId: stand.fairId,
      isAvailable: stand.isAvailable,
      revenueId: stand.revenueId,

      // Dados do cliente (quando stand está ocupado)
      clientName: stand.revenue?.client?.name,
      clientEmail: stand.revenue?.client?.email,
      clientPhone: stand.revenue?.client?.phone,
      clientCnpj: stand.revenue?.client?.cnpj,

      // Dados da receita (quando stand está ocupado)
      revenueStatus: stand.revenue?.status,
      paymentMethod: stand.revenue?.paymentMethod,
      contractValue: stand.revenue?.contractValue,
      numberOfInstallments: stand.revenue?.numberOfInstallments,
      condition: stand.revenue?.condition,
      notes: stand.revenue?.notes,
      revenueCreatedAt: stand.revenue?.createdAt,

      // Dados do entry model
      entryModelName: stand.revenue?.entryModel?.name,
      entryModelBaseValue: stand.revenue?.entryModel?.baseValue,
    };
  }

  async linkStandToRevenue(
    standId: number,
    revenueId: string,
  ): Promise<StandResponseDto> {
    const stand = await this.standRepository.findOne({
      where: { id: standId },
    });

    if (!stand) {
      throw new NotFoundException(`Stand com ID ${standId} não encontrado`);
    }

    // Se o stand já está ocupado por essa mesma receita, não há nada a
    // fazer além de garantir a consistência (idempotente).
    if (!stand.isAvailable && stand.revenueId !== revenueId) {
      throw new BadRequestException('Stand já está ocupado');
    }

    // Verificar se a receita existe
    const revenue = await this.revenueRepository.findOne({
      where: { id: revenueId },
    });

    if (!revenue) {
      throw new NotFoundException(`Receita com ID ${revenueId} não encontrada`);
    }

    // Verificar se a receita já está vinculada a outro stand (ignorando o
    // próprio stand que está sendo vinculado, para permitir corrigir um
    // estado inconsistente sem bloquear a operação nele mesmo).
    const existingStand = await this.standRepository.findOne({
      where: { revenueId },
    });

    if (existingStand && existingStand.id !== stand.id) {
      throw new BadRequestException(
        `Receita já está vinculada ao stand ${existingStand.standNumber}`,
      );
    }

    // Atualizar o stand
    stand.revenueId = revenueId;
    stand.isAvailable = false;
    await this.standRepository.save(stand);

    return this.getStandById(standId);
  }

  async unlinkStandFromRevenue(standId: number): Promise<StandResponseDto> {
    const stand = await this.standRepository.findOne({
      where: { id: standId },
    });

    if (!stand) {
      throw new NotFoundException(`Stand com ID ${standId} não encontrado`);
    }

    // Idempotente: se o stand já está disponível e sem receita vinculada,
    // não há nada a fazer. Isso também permite corrigir um stand que ficou
    // num estado inconsistente (isAvailable=true com revenueId ainda setado).
    if (stand.isAvailable && !stand.revenueId) {
      return this.getStandById(standId);
    }

    // Desvincular o stand
    stand.revenueId = undefined;
    stand.isAvailable = true;
    await this.standRepository.save(stand);

    return this.getStandById(standId);
  }

  async getAvailableStands(fairId: string): Promise<StandResponseDto[]> {
    const stands = await this.standRepository.find({
      where: { fairId, isAvailable: true },
      order: { standNumber: 'ASC' },
    });

    return stands.map((stand) => ({
      id: stand.id,
      standNumber: stand.standNumber,
      fairId: stand.fairId,
      isAvailable: stand.isAvailable,
    }));
  }

  async getOccupiedStands(fairId: string): Promise<StandResponseDto[]> {
    const stands = await this.standRepository
      .createQueryBuilder('stand')
      .leftJoinAndSelect('stand.revenue', 'revenue')
      .leftJoinAndSelect('revenue.client', 'client')
      .leftJoinAndSelect('revenue.entryModel', 'entryModel')
      .where('stand.fairId = :fairId', { fairId })
      .andWhere('stand.isAvailable = :isAvailable', { isAvailable: false })
      .orderBy('stand.standNumber', 'ASC')
      .getMany();

    return stands.map((stand) => ({
      id: stand.id,
      standNumber: stand.standNumber,
      fairId: stand.fairId,
      isAvailable: stand.isAvailable,
      revenueId: stand.revenueId,

      // Dados do cliente (quando stand está ocupado)
      clientName: stand.revenue?.client?.name,
      clientEmail: stand.revenue?.client?.email,
      clientPhone: stand.revenue?.client?.phone,
      clientCnpj: stand.revenue?.client?.cnpj,

      // Dados da receita (quando stand está ocupado)
      revenueStatus: stand.revenue?.status,
      paymentMethod: stand.revenue?.paymentMethod,
      contractValue: stand.revenue?.contractValue,
      numberOfInstallments: stand.revenue?.numberOfInstallments,
      condition: stand.revenue?.condition,
      notes: stand.revenue?.notes,
      revenueCreatedAt: stand.revenue?.createdAt,

      // Dados do entry model
      entryModelName: stand.revenue?.entryModel?.name,
      entryModelBaseValue: stand.revenue?.entryModel?.baseValue,
    }));
  }

  async countAvailableByFairIds(fairIds: string[]): Promise<Record<string, number>> {
    if (!fairIds.length) return {};

    const results = await this.standRepository
      .createQueryBuilder('stand')
      .select('stand.fairId', 'fairId')
      .addSelect('COUNT(*)', 'count')
      .where('stand.fairId IN (:...fairIds)', { fairIds })
      .andWhere('stand.isAvailable = true')
      .groupBy('stand.fairId')
      .getRawMany<{ fairId: string; count: string }>();

    return Object.fromEntries(results.map((r) => [r.fairId, parseInt(r.count)]));
  }

  async getStandStats(fairId: string): Promise<{
    total: number;
    available: number;
    occupied: number;
    occupancyRate: number;
  }> {
    const total = await this.standRepository.count({ where: { fairId } });
    const occupied = await this.standRepository.count({
      where: { fairId, isAvailable: false },
    });
    const available = total - occupied;
    const occupancyRate = total > 0 ? (occupied / total) * 100 : 0;

    return {
      total,
      available,
      occupied,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
    };
  }
}
