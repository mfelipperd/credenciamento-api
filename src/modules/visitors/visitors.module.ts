import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Visitor } from './entities/visitor.entity';
import { VisitorsService } from './visitors.service';
import { VisitorsController } from './visitors.controller';
import { User } from '../users/entitie/users.entity';
import { EmailsModule } from '../emails/emails.module';
import { Fair } from '../fairs/entity/fair.entity';
import { ProspectingModule } from '../prospecting/prospecting.module';

@Module({
  imports: [TypeOrmModule.forFeature([Visitor, User, Fair]), EmailsModule, ProspectingModule],
  providers: [VisitorsService],
  controllers: [VisitorsController],
})
export class VisitorsModule {}
