import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AsistenciasModule } from './asistencias/asistencias.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PersonasModule } from './personas/personas.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportesModule } from './reportes/reportes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    PersonasModule,
    AsistenciasModule,
    DashboardModule,
    ReportesModule,
    AuditoriaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
