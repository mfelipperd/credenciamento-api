import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExhibitorAccount } from '../exhibitors/entities/exhibitor-account.entity';
import { ExhibitorsModule } from '../exhibitors/exhibitors.module';
import { EmailsModule } from '../emails/emails.module';
import { ExhibitorAuthController } from './exhibitor-auth.controller';
import { ExhibitorAuthService } from './exhibitor-auth.service';
import { ExhibitorAuthGuard } from './exhibitor-auth.guard';
import { ExhibitorPasswordResetToken } from './entities/exhibitor-password-reset-token.entity';
import { ExhibitorPasswordResetTokenService } from './exhibitor-password-reset-token.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExhibitorAccount, ExhibitorPasswordResetToken]),
    ExhibitorsModule,
    EmailsModule,
  ],
  controllers: [ExhibitorAuthController],
  providers: [
    ExhibitorAuthService,
    ExhibitorAuthGuard,
    ExhibitorPasswordResetTokenService,
  ],
  exports: [ExhibitorAuthGuard, ExhibitorAuthService],
})
export class ExhibitorAuthModule {}
