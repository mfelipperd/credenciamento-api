import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prospect } from './entities/prospect.entity';
import { Fair } from '../fairs/entity/fair.entity';
import { CnpjService } from './services/cnpj.service';
import { CnaeService } from './services/cnae.service';
import { GeoService } from './services/geo.service';
import { ProspectingService } from './services/prospecting.service';
import { ProspectingController } from './prospecting.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Prospect, Fair])],
  providers: [CnpjService, CnaeService, GeoService, ProspectingService],
  controllers: [ProspectingController],
  exports: [CnpjService, CnaeService, GeoService, ProspectingService],
})
export class ProspectingModule {}
