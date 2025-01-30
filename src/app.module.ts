import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { VisitorsModule } from './modules/visitors/visitors.module';
import { UsersModule } from './modules/users/users.module';
import { CheckInsModule } from './modules/checkins/checkins.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(databaseConfig),
    VisitorsModule,
    UsersModule,
    CheckInsModule,
  ],
})
export class AppModule {}
