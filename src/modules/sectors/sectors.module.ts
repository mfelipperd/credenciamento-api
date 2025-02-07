import { Module } from '@nestjs/common';
import { SectorsService } from './sectors.service';
import { SectorsController } from './sectors.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fair } from '../fairs/entity/fair.entity';
import { Sector } from './sectors.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sector, Fair])],
  providers: [SectorsService],
  controllers: [SectorsController],
})
export class SectorsModule {}
