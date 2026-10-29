import { Body, Controller, Get, Post } from '@nestjs/common';
import { AsistenciasService } from './asistencias.service';
import type { Asistencia, ScanAsistenciaDto } from '../prisma/prisma.service';

@Controller('asistencias')
export class AsistenciasController {
  constructor(private readonly asistenciasService: AsistenciasService) {}

  @Post('scan')
  scan(@Body() dto: ScanAsistenciaDto) {
    return this.asistenciasService.scan(dto);
  }

  @Get()
  findAll(): Asistencia[] {
    return this.asistenciasService.findAll();
  }

  @Get('resumen')
  getResumen() {
    return this.asistenciasService.getResumen();
  }
}
