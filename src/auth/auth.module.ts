import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/modules/users/users.module';
import { EmailsModule } from 'src/modules/emails/emails.module';
import { jwtConfig } from 'src/config/jwt.config';

@Module({
  imports: [
    UsersModule,
    EmailsModule,
    PassportModule,
    JwtModule.register(jwtConfig),
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
