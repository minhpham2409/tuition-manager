import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClassesModule } from './classes/classes.module';
import { StudentsModule } from './students/students.module';
import { InvoicesModule } from './invoices/invoices.module';
import { BankAccountsModule } from './bank-accounts/bank-accounts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { WebhookModule } from './webhooks/webhook.module';
import { PublicModule } from './public/public.module';
import { LessonsModule } from './lessons/lessons.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    PrismaModule,
    AuthModule,
    ClassesModule,
    StudentsModule,
    InvoicesModule,
    BankAccountsModule,
    DashboardModule,
    WebhookModule,
    PublicModule,
    LessonsModule,
  ],
})
export class AppModule {}
