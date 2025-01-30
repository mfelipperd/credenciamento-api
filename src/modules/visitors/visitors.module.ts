import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Visitor } from './entities/visitor.entity';
import { VisitorsService } from './visitors.service';
import { VisitorsController } from './visitors.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Visitor])],
  providers: [VisitorsService],
  controllers: [VisitorsController],
})
export class VisitorsModule {}
