import { Module } from '@nestjs/common';
import { FairsService } from './fairs.service';
import { FairsController } from './fairs.controller';
import { StandConfigurationService } from './stand-configuration.service';
import { StandConfigurationController } from './stand-configuration.controller';
import { FairAnalysisService } from './fair-analysis.service';
import { FairAnalysisController } from './fair-analysis.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fair } from './entity/fair.entity';
import { StandConfiguration } from './entity/stand-configuration.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Fair, StandConfiguration])],
  providers: [FairsService, StandConfigurationService, FairAnalysisService],
  controllers: [FairsController, StandConfigurationController, FairAnalysisController],
  exports: [FairsService, StandConfigurationService, FairAnalysisService],
})
export class FairsModule {}
