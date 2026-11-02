import { Injectable } from '@nestjs/common';
import { EstadoAsistencia } from '@prisma/client';
import ExcelJS from 'exceljs';
import { DateTime } from 'luxon';
import { construirFiltroAsistencia } from '../common/asistencia-where';
import { AsistenciaFiltrosQueryDto } from '../common/dto/asistencia-filtros-query.dto';
import { PrismaService } from '../prisma/prisma.service';

const ESTADOS_REPORTE: Record<
  EstadoAsistencia,
  { codigo: 'P' | 'T' | 'F'; descripcion: string }
> = {
  PUNTUAL: { codigo: 'P', descripcion: 'Presente - asistió puntual' },
  TARDANZA: { codigo: 'T', descripcion: 'Tardanza' },
  FALTA: { codigo: 'F', descripcion: 'Falta' },
};

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAsistencias(query: AsistenciaFiltrosQueryDto) {
    const asistencias = await this.prisma.asistencia.findMany({
      where: construirFiltroAsistencia(query),
      include: { persona: true },
      orderBy: [{ fechaEscolar: 'desc' }, { fechaHora: 'desc' }],
    });

    return asistencias.map((asistencia) => {
      const estadoReporte = ESTADOS_REPORTE[asistencia.estado];
      return {
        fecha: asistencia.fechaEscolar,
        hora:
          asistencia.estado === 'FALTA'
            ? ''
            : DateTime.fromJSDate(asistencia.fechaHora, {
                zone: 'America/Lima',
              }).toFormat('HH:mm:ss'),
        persona: `${asistencia.persona.nombres} ${asistencia.persona.apellidos}`,
        tipo: asistencia.persona.tipo,
        estado: asistencia.estado,
        estadoCodigo: estadoReporte.codigo,
        estadoDescripcion: estadoReporte.descripcion,
      };
    });
  }

  async getExcelReport(query: AsistenciaFiltrosQueryDto) {
    const rows = await this.getAsistencias(query);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Asistencias');

    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Hora', key: 'hora', width: 12 },
      { header: 'Persona', key: 'persona', width: 35 },
      { header: 'Tipo', key: 'tipo', width: 18 },
      { header: 'Estado', key: 'estado', width: 18 },
      { header: 'Código', key: 'estadoCodigo', width: 10 },
      { header: 'Descripción', key: 'estadoDescripcion', width: 30 },
    ];
    worksheet.addRows(rows);
    worksheet.getRow(1).font = { bold: true };
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: worksheet.columns.length },
    };

    return workbook.xlsx.writeBuffer();
  }
}
