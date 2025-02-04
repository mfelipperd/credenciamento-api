import { Body, Controller, Get, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserInputDto } from './users.dto';
import { IsPublicRoute } from 'src/auth/public.route';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getUsers() {
    return this.usersService.getUsers();
  }

  @Post()
  @IsPublicRoute()
  createUser(@Body() user: CreateUserInputDto) {
    return this.usersService.createUser(user);
  }
}
