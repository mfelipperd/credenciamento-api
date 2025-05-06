import { Module } from '@nestjs/common';
import { FairsService } from './fairs.service';
import { FairsController } from './fairs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fair } from './entity/fair.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Fair])],
  providers: [FairsService],
  controllers: [FairsController],
  exports: [FairsService],
})
export class FairsModule {}
