import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Visitor } from 'src/modules/visitors/entities/visitor.entity';
import { Fair } from 'src/modules/fairs/entity/fair.entity';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  url: process.env.DATABASE_URL,
  autoLoadEntities: true,
  synchronize: true, // cuidado: apenas para desenvolvimento
  entities: [Visitor, Fair],
};
