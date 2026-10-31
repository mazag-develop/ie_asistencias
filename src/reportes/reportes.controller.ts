import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AsistenciaFiltrosQueryDto } from '../common/dto/asistencia-filtros-query.dto';
import { ReportesService } from './reportes.service';

@ApiTags('reportes')
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('asistencias')
  getAsistencias(@Query() query: AsistenciaFiltrosQueryDto) {
    return this.reportesService.getAsistencias(query);
  }

  @Get('asistencias/excel')
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async getExcelReport(
    @Query() query: AsistenciaFiltrosQueryDto,
    @Res() response: Response,
  ) {
    const workbook = await this.reportesService.getExcelReport(query);

    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="reporte-asistencias.xlsx"',
    );
    response.end(workbook);
  }
}
