import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Visitor } from '../visitors/entities/visitor.entity';
import { CheckIn } from './entity/checkins.entity';
import { CheckInsService } from './checkins.service';
import { CheckInsController } from './checkins.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CheckIn, Visitor])],
  providers: [CheckInsService],
  controllers: [CheckInsController],
})
export class CheckInsModule {}
