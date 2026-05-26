import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailsService, EMAIL_QUEUE } from './emails.service';
import { EmailsController } from './emails.controller';
import { EmailProcessor } from './email.processor';
import { Visitor } from '../visitors/entities/visitor.entity';
import { FairsModule } from '../fairs/fairs.module';
import { Fair } from '../fairs/entity/fair.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Visitor, Fair]),
    FairsModule,
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
  ],
  providers: [EmailsService, EmailProcessor],
  controllers: [EmailsController],
  exports: [EmailsService],
})
export class EmailsModule {}
