import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AsistenciasQueryDto } from '../common/dto/asistencias-query.dto';
import { RegistrarScanDto } from './dto/registrar-scan.dto';
import { ResumenDiarioQueryDto } from './dto/resumen-diario-query.dto';
import { AsistenciasService } from './asistencias.service';

@ApiTags('asistencias')
@Controller('asistencias')
export class AsistenciasController {
  constructor(private readonly asistenciasService: AsistenciasService) {}

  @Post('scan')
  scan(@Body() dto: RegistrarScanDto) {
    return this.asistenciasService.scan(dto);
  }

  @Get('diaria')
  getResumenDiario(@Query() query: ResumenDiarioQueryDto) {
    return this.asistenciasService.getResumenDiario(query.tipo);
  }

  @Get()
  findAll(@Query() query: AsistenciasQueryDto) {
    return this.asistenciasService.findAll(query);
  }

  @Get('resumen')
  getResumen() {
    return this.asistenciasService.getResumen();
  }
}
