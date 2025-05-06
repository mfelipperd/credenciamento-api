import { Module } from '@nestjs/common';
import { EmailsService } from './emails.service';
import { EmailsController } from './emails.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Visitor } from '../visitors/entities/visitor.entity';
import { FairsModule } from '../fairs/fairs.module';
import { Fair } from '../fairs/entity/fair.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Visitor, Fair]), FairsModule],
  providers: [EmailsService],
  controllers: [EmailsController],
  exports: [EmailsService],
})
export class EmailsModule {}
