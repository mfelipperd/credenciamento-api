import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { Visitor } from './entities/visitor.entity';
import { VisitorsService } from './visitors.service';
import { VisitorsController } from './visitors.controller';
import { User } from '../users/entitie/users.entity';
import { EmailsModule } from '../emails/emails.module';
import { Fair } from '../fairs/entity/fair.entity';
import { ProspectingModule } from '../prospecting/prospecting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Visitor, User, Fair]),
    EmailsModule,
    ProspectingModule,
    ThrottlerModule.forRoot([{ name: 'visitor-reuse', ttl: 600_000, limit: 5 }]),
  ],
  providers: [VisitorsService],
  controllers: [VisitorsController],
  exports: [VisitorsService],
})
export class VisitorsModule {}
