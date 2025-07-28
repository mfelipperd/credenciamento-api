import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entitie/users.entity';
import { Repository } from 'typeorm';
import { CreateUserInputDto } from './users.dto';
import { UpdateUserInputDto } from './update-users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  getUsers() {
    return this.userRepository.find();
  }

  async createUser(user: CreateUserInputDto) {
    const verifyUserExists = await this.userRepository.findOne({
      where: { email: user.email },
    });
    if (verifyUserExists) {
      throw new ConflictException('User already exists');
    }
    return this.userRepository.save(user);
  }

  getUser(id: number) {
    return this.userRepository.findOne({ where: { id } });
  }

  findByEmail(email: string) {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async updateUser(id: number, data: UpdateUserInputDto): Promise<User> {
    // tenta carregar a entidade existente e aplicar o data
    const user = await this.userRepository.preload({
      id,
      ...data,
    });

    if (!user) {
      throw new NotFoundException(`Usuário #${id} não encontrado`);
    }

    try {
      return await this.userRepository.save(user);
    } catch (error) {
      throw new ConflictException('Erro ao atualizar usuário: ' + error);
    }
  }
}
