import { Module } from '@nestjs/common';
import { AsistenciasModule } from '../asistencias/asistencias.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AsistenciasModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
