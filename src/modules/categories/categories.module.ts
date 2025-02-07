import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Fair } from 'src/modules/fairs/entity/fair.entity';
import { Category } from './entity/categories.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Fair])], // 🔹 Certifique-se de que Category está aqui
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService, TypeOrmModule], // 🔹 Exporta para ser usado em outros módulos
})
export class CategoriesModule {}
