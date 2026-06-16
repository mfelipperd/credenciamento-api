import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prospect } from './entities/prospect.entity';
import { CnpjService } from './services/cnpj.service';
import { CnaeService } from './services/cnae.service';
import { ProspectingService } from './services/prospecting.service';
import { ProspectingController } from './prospecting.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Prospect])],
  providers: [CnpjService, CnaeService, ProspectingService],
  controllers: [ProspectingController],
  exports: [CnpjService, CnaeService, ProspectingService],
})
export class ProspectingModule {}
