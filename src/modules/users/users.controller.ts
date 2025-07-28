import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserInputDto } from './users.dto';
import { IsPublicRoute } from 'src/auth/public.route';
import { UpdateUserInputDto } from './update-users.dto';

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

  @Patch(':id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateUserInputDto,
  ) {
    return this.usersService.updateUser(id, data);
  }
}
