import * as dotenv from 'dotenv';
dotenv.config(); // força leitura caso falhe no Nest

import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Visitor } from 'src/modules/visitors/entities/visitor.entity';
import { Fair } from 'src/modules/fairs/entity/fair.entity';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  url: process.env.DATABASE_URL?.trim(),
  autoLoadEntities: true,
  synchronize: true,
  entities: [Visitor, Fair],
};
