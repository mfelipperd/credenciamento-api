import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entitie/users.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserFairService } from './user-fair.service';
import { PasswordResetTokenService } from './password-reset-token.service';
import { EmailsService } from '../emails/emails.service';
import { EUserRole } from '../../enum/role';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private userFairService: UserFairService,
    private passwordResetTokenService: PasswordResetTokenService,
    private emailsService: EmailsService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Verificar se já existe usuário com este email
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException(
        'Já existe um usuário cadastrado com este email',
      );
    }

    // Verificar CPF único se fornecido
    if (createUserDto.cpf) {
      const existingCpf = await this.userRepository.findOne({
        where: { cpf: createUserDto.cpf },
      });

      if (existingCpf) {
        throw new ConflictException(
          'Já existe um usuário cadastrado com este CPF',
        );
      }
    }

    // Extrair fairIds do DTO
    const { fairIds, ...userData } = createUserDto;

    // Senha nunca é definida pelo admin: gera um segredo aleatório inutilizável
    // e hasheia. O usuário define a própria senha pelo fluxo de primeiro acesso.
    const unusablePassword = randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(unusablePassword, BCRYPT_ROUNDS);

    const user = this.userRepository.create({
      ...userData,
      password: hashedPassword,
      passwordSet: false,
    });
    const savedUser = await this.userRepository.save(user);

    // Associar usuário às feiras se fornecidas
    if (fairIds && fairIds.length > 0) {
      for (const fairId of fairIds) {
        try {
          await this.userFairService.create({
            userId: savedUser.id,
            fairId: fairId,
            isActive: true,
          });
        } catch (error) {
          this.logger.warn(
            `Erro ao associar usuário ${savedUser.id} à feira ${fairId}: ${error.message}`,
          );
        }
      }
    }

    try {
      const code = await this.passwordResetTokenService.issueCode(
        savedUser,
        'first_access',
      );
      await this.emailsService.sendFirstAccessEmail(
        savedUser.email,
        savedUser.name,
        code,
      );
    } catch (error) {
      this.logger.warn(
        `Erro ao enviar email de primeiro acesso pra ${savedUser.email}: ${error.message}`,
      );
    }

    this.logger.log(`Usuário criado: ${savedUser.name} (ID: ${savedUser.id})`);

    // Buscar feiras associadas para retornar
    const userFairs = await this.userFairService.findByUser(savedUser.id);
    const associatedFairIds = userFairs.map((uf) => uf.fairId);

    return new UserResponseDto(savedUser, associatedFairIds);
  }

  async findAll(filters?: {
    role?: EUserRole;
    isActive?: boolean;
  }): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find({
      where: {
        ...(filters?.role ? { role: filters.role } : {}),
        ...(filters?.isActive !== undefined
          ? { isActive: filters.isActive }
          : {}),
      },
      order: { name: 'ASC' },
    });

    const usersWithFairs = await Promise.all(
      users.map(async (user) => {
        const userFairs = await this.userFairService.findByUser(user.id);
        const fairIds = userFairs.map((uf) => uf.fairId);
        return new UserResponseDto(user, fairIds);
      }),
    );

    return usersWithFairs;
  }

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Buscar feiras associadas
    const userFairs = await this.userFairService.findByUser(id);
    const fairIds = userFairs.map((uf) => uf.fairId);

    return new UserResponseDto(user, fairIds);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
    });
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar email único se estiver sendo alterado
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException(
          'Já existe um usuário cadastrado com este email',
        );
      }
    }

    // Verificar CPF único se estiver sendo alterado
    if (updateUserDto.cpf && updateUserDto.cpf !== user.cpf) {
      const existingCpf = await this.userRepository.findOne({
        where: { cpf: updateUserDto.cpf },
      });

      if (existingCpf) {
        throw new ConflictException(
          'Já existe um usuário cadastrado com este CPF',
        );
      }
    }

    // Extrair fairIds do DTO — senha nunca é alterada por aqui (só via
    // changePassword/reset-password/first-access), mesmo que venha no corpo
    const { fairIds, ...userData } = updateUserDto;
    delete (userData as Record<string, unknown>).password;

    Object.assign(user, userData);
    const updatedUser = await this.userRepository.save(user);

    // Gerenciar associações com feiras se fornecidas
    if (fairIds !== undefined) {
      // Remover todas as associações existentes
      const existingUserFairs = await this.userFairService.findByUser(id);
      for (const userFair of existingUserFairs) {
        try {
          await this.userFairService.remove(userFair.id);
        } catch (error) {
          this.logger.warn(
            `Erro ao remover associação ${userFair.id}: ${error.message}`,
          );
        }
      }

      // Criar novas associações
      if (fairIds && fairIds.length > 0) {
        for (const fairId of fairIds) {
          try {
            await this.userFairService.create({
              userId: id,
              fairId: fairId,
              isActive: true,
            });
          } catch (error) {
            this.logger.warn(
              `Erro ao associar usuário ${id} à feira ${fairId}: ${error.message}`,
            );
          }
        }
      }
    }

    this.logger.log(
      `Usuário atualizado: ${updatedUser.name} (ID: ${updatedUser.id})`,
    );

    // Buscar feiras associadas para retornar
    const userFairs = await this.userFairService.findByUser(id);
    const associatedFairIds = userFairs.map((uf) => uf.fairId);

    return new UserResponseDto(updatedUser, associatedFairIds);
  }

  async remove(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    await this.userRepository.remove(user);
    this.logger.log(`Usuário removido: ${user.name} (ID: ${id})`);
  }

  async changePassword(
    id: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar senha atual
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Senha atual incorreta');
    }

    // Atualizar senha
    user.password = await bcrypt.hash(
      changePasswordDto.newPassword,
      BCRYPT_ROUNDS,
    );
    user.passwordSet = true;
    await this.userRepository.save(user);

    this.logger.log(`Senha alterada para usuário: ${user.name} (ID: ${id})`);
  }

  /** Usado pelos fluxos de primeiro acesso e recuperação de senha, depois do código já validado. */
  async setPassword(userId: number, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.passwordSet = true;
    await this.userRepository.save(user);

    this.logger.log(`Senha definida via código para usuário: ${user.name} (ID: ${userId})`);
  }

  async resendInvite(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (user.passwordSet) {
      throw new BadRequestException(
        'Este usuário já concluiu o primeiro acesso. Use a recuperação de senha se necessário.',
      );
    }

    const code = await this.passwordResetTokenService.issueCode(
      user,
      'first_access',
    );

    try {
      await this.emailsService.sendFirstAccessEmail(user.email, user.name, code);
    } catch (error) {
      this.logger.warn(
        `Erro ao reenviar email de primeiro acesso pra ${user.email}: ${error.message}`,
      );
      throw new BadRequestException(
        'Não foi possível enviar o email. Tente novamente em instantes.',
      );
    }

    this.logger.log(`Convite de primeiro acesso reenviado: ${user.name} (ID: ${id})`);
  }

  async toggleActive(id: number): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    user.isActive = !user.isActive;
    const updatedUser = await this.userRepository.save(user);

    this.logger.log(
      `Usuário ${updatedUser.isActive ? 'ativado' : 'desativado'}: ${updatedUser.name} (ID: ${id})`,
    );

    return new UserResponseDto(updatedUser);
  }

  async findByRole(role: string): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find({
      where: { role: role as any },
      order: { name: 'ASC' },
    });

    return users.map((user) => new UserResponseDto(user));
  }

  async getActiveUsers(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    return users.map((user) => new UserResponseDto(user));
  }

  async getUsersStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    usersByRole: Record<string, number>;
  }> {
    const users = await this.userRepository.find();

    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.isActive).length;
    const inactiveUsers = totalUsers - activeUsers;

    const usersByRole = users.reduce(
      (acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole,
    };
  }

  // Métodos de compatibilidade (para não quebrar o código existente)
  async getUsers() {
    return this.findAll();
  }

  async createUser(user: any) {
    return this.create(user);
  }

  async getUser(id: number) {
    return this.findOne(id);
  }

  async updateUser(id: number, data: any) {
    return this.update(id, data);
  }
}
