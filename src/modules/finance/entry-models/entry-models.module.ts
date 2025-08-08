import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntryModelsService } from './entry-models.service';
import { EntryModelsController } from './entry-models.controller';
import { EntryModel } from './entities/entry-model.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EntryModel])],
  controllers: [EntryModelsController],
  providers: [EntryModelsService],
  exports: [EntryModelsService],
})
export class EntryModelsModule {}
