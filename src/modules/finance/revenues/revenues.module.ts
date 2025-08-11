import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RevenuesService } from './revenues.service';
import { RevenuesController } from './revenues.controller';
import { RevenueChartsController } from './revenue-charts.controller';
import { RevenueChartsService } from './revenue-charts.service';
import { Revenue } from './entities/revenue.entity';
import { RevenueInstallment } from './entities/revenue-installment.entity';
import { Stand } from '../stands/entities/stand.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Revenue, RevenueInstallment, Stand])],
  controllers: [RevenuesController, RevenueChartsController],
  providers: [RevenuesService, RevenueChartsService],
  exports: [RevenuesService, RevenueChartsService],
})
export class RevenuesModule {}
