import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entitie/users.entity';
import { Repository } from 'typeorm';
import { CreateUserInputDto } from './users.dto';

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
}
