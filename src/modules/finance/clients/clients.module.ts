import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { BrandsController } from './brands.controller';
import { FairImagesController } from './fair-images.controller';
import { Client } from './entities/client.entity';
import { Brand } from './entities/brand.entity';
import { ClientImage, ClientImageFair } from './entities/client-image.entity';
import { StorageModule } from '../../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, Brand, ClientImage, ClientImageFair]),
    StorageModule,
  ],
  controllers: [ClientsController, BrandsController, FairImagesController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
