import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserFairService } from './user-fair.service';
import { UserFairController } from './user-fair.controller';
import { User } from './entitie/users.entity';
import { UserFair } from './entities/user-fair.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { Fair } from '../fairs/entity/fair.entity';
import { PasswordResetTokenService } from './password-reset-token.service';
import { EmailsModule } from '../emails/emails.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserFair, Fair, PasswordResetToken]),
    EmailsModule,
  ],
  providers: [UsersService, UserFairService, PasswordResetTokenService],
  controllers: [UsersController, UserFairController],
  exports: [UsersService, UserFairService, PasswordResetTokenService],
})
export class UsersModule {}
