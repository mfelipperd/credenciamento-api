import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFair } from './entities/user-fair.entity';
import { User } from './entitie/users.entity';
import { Fair } from '../fairs/entity/fair.entity';
import { CreateUserFairDto } from './dto/create-user-fair.dto';
import { UpdateUserFairDto } from './dto/update-user-fair.dto';
import { UserFairResponseDto } from './dto/user-fair-response.dto';

@Injectable()
export class UserFairService {
  private readonly logger = new Logger(UserFairService.name);

  constructor(
    @InjectRepository(UserFair)
    private userFairRepository: Repository<UserFair>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Fair)
    private fairRepository: Repository<Fair>,
  ) {}

  async create(
    createUserFairDto: CreateUserFairDto,
  ): Promise<UserFairResponseDto> {
    // Verificar se o usuário existe
    const user = await this.userRepository.findOne({
      where: { id: createUserFairDto.userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se a feira existe
    const fair = await this.fairRepository.findOne({
      where: { id: createUserFairDto.fairId },
    });

    if (!fair) {
      throw new NotFoundException('Feira não encontrada');
    }

    // Verificar se já existe associação ativa
    const existingAssociation = await this.userFairRepository.findOne({
      where: {
        userId: createUserFairDto.userId,
        fairId: createUserFairDto.fairId,
        isActive: true,
      },
    });

    if (existingAssociation) {
      throw new ConflictException('Usuário já está associado a esta feira');
    }

    // Criar nova associação
    const userFair = this.userFairRepository.create({
      ...createUserFairDto,
      isActive: createUserFairDto.isActive ?? true,
    });

    const savedUserFair = await this.userFairRepository.save(userFair);

    this.logger.log(`Usuário ${user.name} associado à feira ${fair.name}`);

    return this.mapToResponseDto(savedUserFair);
  }

  async findAll(): Promise<UserFairResponseDto[]> {
    const userFairs = await this.userFairRepository.find({
      relations: ['user', 'fair'],
      order: { createdAt: 'DESC' },
    });

    return userFairs.map((userFair) => this.mapToResponseDto(userFair));
  }

  async findByUser(userId: number): Promise<UserFairResponseDto[]> {
    const userFairs = await this.userFairRepository.find({
      where: { userId },
      relations: ['user', 'fair'],
      order: { createdAt: 'DESC' },
    });

    return userFairs.map((userFair) => this.mapToResponseDto(userFair));
  }

  async findByFair(fairId: string): Promise<UserFairResponseDto[]> {
    const userFairs = await this.userFairRepository.find({
      where: { fairId },
      relations: ['user', 'fair'],
      order: { createdAt: 'DESC' },
    });

    return userFairs.map((userFair) => this.mapToResponseDto(userFair));
  }

  async findOne(id: string): Promise<UserFairResponseDto> {
    const userFair = await this.userFairRepository.findOne({
      where: { id },
      relations: ['user', 'fair'],
    });

    if (!userFair) {
      throw new NotFoundException('Associação usuário-feira não encontrada');
    }

    return this.mapToResponseDto(userFair);
  }

  async update(
    id: string,
    updateUserFairDto: UpdateUserFairDto,
  ): Promise<UserFairResponseDto> {
    const userFair = await this.userFairRepository.findOne({
      where: { id },
    });

    if (!userFair) {
      throw new NotFoundException('Associação usuário-feira não encontrada');
    }

    // Se estiver alterando usuário ou feira, verificar se não existe conflito
    if (updateUserFairDto.userId || updateUserFairDto.fairId) {
      const userId = updateUserFairDto.userId ?? userFair.userId;
      const fairId = updateUserFairDto.fairId ?? userFair.fairId;

      const existingAssociation = await this.userFairRepository.findOne({
        where: {
          userId,
          fairId,
          isActive: true,
        },
      });

      if (existingAssociation && existingAssociation.id !== id) {
        throw new ConflictException(
          'Já existe uma associação ativa entre este usuário e esta feira',
        );
      }
    }

    Object.assign(userFair, updateUserFairDto);
    const savedUserFair = await this.userFairRepository.save(userFair);

    this.logger.log(`Associação usuário-feira atualizada: ${id}`);

    return this.mapToResponseDto(savedUserFair);
  }

  async remove(id: string): Promise<void> {
    const userFair = await this.userFairRepository.findOne({
      where: { id },
    });

    if (!userFair) {
      throw new NotFoundException('Associação usuário-feira não encontrada');
    }

    await this.userFairRepository.remove(userFair);
    this.logger.log(`Associação usuário-feira removida: ${id}`);
  }

  async toggleActive(id: string): Promise<UserFairResponseDto> {
    const userFair = await this.userFairRepository.findOne({
      where: { id },
    });

    if (!userFair) {
      throw new NotFoundException('Associação usuário-feira não encontrada');
    }

    userFair.isActive = !userFair.isActive;
    const savedUserFair = await this.userFairRepository.save(userFair);

    this.logger.log(
      `Status da associação usuário-feira alterado: ${id} -> ${savedUserFair.isActive ? 'Ativo' : 'Inativo'}`,
    );

    return this.mapToResponseDto(savedUserFair);
  }

  async getActiveUsersByFair(fairId: string): Promise<UserFairResponseDto[]> {
    const userFairs = await this.userFairRepository.find({
      where: { fairId, isActive: true },
      relations: ['user', 'fair'],
      order: { createdAt: 'DESC' },
    });

    return userFairs.map((userFair) => this.mapToResponseDto(userFair));
  }

  async getActiveFairsByUser(userId: number): Promise<UserFairResponseDto[]> {
    const userFairs = await this.userFairRepository.find({
      where: { userId, isActive: true },
      relations: ['user', 'fair'],
      order: { createdAt: 'DESC' },
    });

    return userFairs.map((userFair) => this.mapToResponseDto(userFair));
  }

  private mapToResponseDto(userFair: UserFair): UserFairResponseDto {
    return {
      id: userFair.id,
      userId: userFair.userId,
      fairId: userFair.fairId,
      isActive: userFair.isActive,
      role: userFair.role,
      notes: userFair.notes,
      createdAt: userFair.createdAt,
      updatedAt: userFair.updatedAt,
      user: userFair.user
        ? {
            id: userFair.user.id,
            name: userFair.user.name,
            email: userFair.user.email,
            role: userFair.user.role,
          }
        : undefined,
      fair: userFair.fair
        ? {
            id: userFair.fair.id,
            name: userFair.fair.name,
            location: userFair.fair.location,
            date: userFair.fair.startDate,
          }
        : undefined,
    };
  }
}
