import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { VisitorsModule } from './modules/visitors/visitors.module';
import { UsersModule } from './modules/users/users.module';
import { CheckInsModule } from './modules/checkins/checkins.module';
import { AuthModule } from './auth/auth.module';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { EmailsModule } from './modules/emails/emails.module';
import { MySqlFilter } from './filters/mysql.filter';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FairsModule } from './modules/fairs/fairs.module';
import { HowDidYouKnowModule } from './modules/how-did-you-know/how-did-you-know.module';
import { CategoriesService } from './modules/categories/categories.service';
import { CategoriesController } from './modules/categories/categories.controller';
import { SectorsModule } from './modules/sectors/sectors.module';

@Module({
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: MySqlFilter },
    CategoriesService,
  ],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(databaseConfig),
    VisitorsModule,
    UsersModule,
    CheckInsModule,
    AuthModule,
    EmailsModule,
    DashboardModule,
    FairsModule,
    HowDidYouKnowModule,
    SectorsModule,
  ],
  controllers: [CategoriesController],
})
export class AppModule {}
