import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { WhatsappProcessor, WHATSAPP_QUEUE } from './whatsapp.processor';
import { WhatsappCampaign } from './entities/whatsapp-campaign.entity';
import { Visitor } from '../visitors/entities/visitor.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WhatsappCampaign, Visitor]),
    BullModule.registerQueue({ name: WHATSAPP_QUEUE }),
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappProcessor],
  exports: [WhatsappService],
})
export class WhatsappModule {}
