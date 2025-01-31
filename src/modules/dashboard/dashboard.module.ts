import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Visitor } from '../visitors/entities/visitor.entity';
import { CheckIn } from '../checkins/entity/checkins.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Visitor, CheckIn])],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
