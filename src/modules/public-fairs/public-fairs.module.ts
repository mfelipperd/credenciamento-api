import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fair } from '../fairs/entity/fair.entity';
import { ClientsModule } from '../finance/clients/clients.module';
import { PublicFairsService } from './public-fairs.service';
import { PublicFairsController } from './public-fairs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Fair]),
    ClientsModule,
  ],
  providers: [PublicFairsService],
  controllers: [PublicFairsController],
})
export class PublicFairsModule {}
