import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { PeopleModule } from './people/people.module';
import { SalesModule } from './sales/sales.module';
import { FarmsModule } from './farms/farms.module';
import { HarvestsModule } from './harvests/harvests.module';
import { CommoditiesModule } from './commodities/commodities.module';
import { RubberWorkersModule } from './rubber-workers/rubber-workers.module';
import { CreditModule } from './credit/credit.module';
import { SettlementsModule } from './settlements/settlements.module';
import { MoneyTransactionsModule } from './money-transactions/money-transactions.module';
import { ReportsModule } from './reports/reports.module';
import { AiModule } from './ai/ai.module';
import { WorkersModule } from './workers/workers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    PeopleModule,
    SalesModule,
    FarmsModule,
    HarvestsModule,
    CommoditiesModule,
    RubberWorkersModule,
    CreditModule,
    SettlementsModule,
    MoneyTransactionsModule,
    ReportsModule,
    AiModule,
    WorkersModule,
  ],
})
export class AppModule {}