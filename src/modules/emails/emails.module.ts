import { Module } from '@nestjs/common';
import { EmailsService } from './emails.service';
import { EmailsController } from './emails.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Visitor } from '../visitors/entities/visitor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Visitor])],
  providers: [EmailsService],
  controllers: [EmailsController],
})
export class EmailsModule {}
