import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fair } from '../fairs/entity/fair.entity';
import { Client } from '../finance/clients/entities/client.entity';
import { User } from '../users/entitie/users.entity';
import { ExhibitorFair } from './entities/exhibitor-fair.entity';
import { ExhibitorFairMember } from './entities/exhibitor-fair-member.entity';
import { ExhibitorInvitation } from './entities/exhibitor-invitation.entity';
import { ExhibitorMember } from './entities/exhibitor-member.entity';
import { Exhibitor } from './entities/exhibitor.entity';
import { ExhibitorFinanceClient } from './entities/exhibitor-finance-client.entity';
import { ExhibitorsController } from './exhibitors.controller';
import { ExhibitorsService } from './exhibitors.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Client,
      Fair,
      User,
      ExhibitorMember,
      ExhibitorFair,
      ExhibitorFairMember,
      ExhibitorInvitation,
      Exhibitor,
      ExhibitorFinanceClient,
    ]),
  ],
  controllers: [ExhibitorsController],
  providers: [ExhibitorsService],
  exports: [ExhibitorsService],
})
export class ExhibitorsModule {}
