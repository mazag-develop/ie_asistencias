import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AsistenciasModule } from './asistencias/asistencias.module';
import { PersonasModule } from './personas/personas.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, PersonasModule, AsistenciasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
