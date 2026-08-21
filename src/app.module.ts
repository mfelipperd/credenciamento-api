import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
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
import { SectorsModule } from './modules/sectors/sectors.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { FinanceModule } from './modules/finance/finance.module';
import { PartnersModule } from './modules/partners/partners.module';
import { PublicFairsModule } from './modules/public-fairs/public-fairs.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { ProspectingModule } from './modules/prospecting/prospecting.module';
import { McpModule } from './modules/mcp/mcp.module';
import { ExhibitorsModule } from './modules/exhibitors/exhibitors.module';

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
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      }),
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
    CategoriesModule,
    FinanceModule,
    PartnersModule,
    PublicFairsModule,
    WhatsappModule,
    ProspectingModule,
    McpModule,
    ExhibitorsModule,
  ],
  controllers: [],
})
export class AppModule {}
