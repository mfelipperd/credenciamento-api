import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserFairService } from './user-fair.service';
import { UserFairController } from './user-fair.controller';
import { User } from './entitie/users.entity';
import { UserFair } from './entities/user-fair.entity';
import { Fair } from '../fairs/entity/fair.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserFair, Fair])],
  providers: [UsersService, UserFairService],
  controllers: [UsersController, UserFairController],
  exports: [UsersService, UserFairService],
})
export class UsersModule {}
