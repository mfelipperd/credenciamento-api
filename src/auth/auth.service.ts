import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/modules/users/users.service';
import { LoginDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(data: LoginDto) {
    const { email, password } = data;
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user && password !== user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Buscar feiras associadas ao usuário
    const userResponse = await this.usersService.findOne(user.id);
    const fairIds = userResponse.fairIds || [];

    const payload = {
      email: user.email,
      name: user.name,
      id: user.id,
      role: user.role,
      fairIds: fairIds,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        fairIds: fairIds,
      },
    };
  }
}
