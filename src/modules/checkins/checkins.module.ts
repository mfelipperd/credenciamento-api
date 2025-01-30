import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Visitor } from '../visitors/entities/visitor.entity';
import { CheckIn } from './entity/checkins.entity';
import { CheckinsService } from './checkins.service';
import { CheckinsController } from './checkins.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CheckIn, Visitor])],
  providers: [CheckinsService],
  controllers: [CheckinsController],
})
export class CheckInsModule {}
