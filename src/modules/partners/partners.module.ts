import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnersService } from './partners.service';
import { PartnersController } from './partners.controller';
import { FairPartnersService } from './fair-partners.service';
import { FairPartnersController } from './fair-partners.controller';
import { ProfitDistributionService } from './profit-distribution.service';
import { Partner } from './entities/partner.entity';
import { PartnerWithdrawal } from './entities/partner-withdrawal.entity';
import { FairPartner } from './entities/fair-partner.entity';
import { User } from '../users/entitie/users.entity';
import { Fair } from '../fairs/entity/fair.entity';
import { CashFlowModule } from '../finance/cash-flow/cash-flow.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Partner, PartnerWithdrawal, FairPartner, User, Fair]),
    forwardRef(() => CashFlowModule)
  ],
  controllers: [PartnersController, FairPartnersController],
  providers: [PartnersService, FairPartnersService, ProfitDistributionService],
  exports: [PartnersService, FairPartnersService, ProfitDistributionService],
})
export class PartnersModule {}
