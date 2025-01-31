import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Visitor } from './entities/visitor.entity';
import { VisitorsService } from './visitors.service';
import { VisitorsController } from './visitors.controller';
import { EmailsService } from '../emails/emails.service';

@Module({
  imports: [TypeOrmModule.forFeature([Visitor])],
  providers: [VisitorsService, EmailsService],
  controllers: [VisitorsController],
})
export class VisitorsModule {}
