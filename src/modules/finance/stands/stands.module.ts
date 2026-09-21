import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StandsController } from './stands.controller';
import { StandsService } from './stands.service';
import { Stand } from './entities/stand.entity';
import { Revenue } from '../revenues/entities/revenue.entity';
import { StandConfiguration } from '../../fairs/entity/stand-configuration.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Stand, Revenue, StandConfiguration])],
  controllers: [StandsController],
  providers: [StandsService],
  exports: [StandsService],
})
export class StandsModule {}
