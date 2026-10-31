import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { construirFiltroAsistencia } from '../common/asistencia-where';
import { AsistenciaFiltrosQueryDto } from '../common/dto/asistencia-filtros-query.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAsistencias(query: AsistenciaFiltrosQueryDto) {
    const asistencias = await this.prisma.asistencia.findMany({
      where: construirFiltroAsistencia(query),
      include: { persona: true },
      orderBy: [{ fechaEscolar: 'desc' }, { fechaHora: 'desc' }],
    });

    return asistencias.map((asistencia) => ({
      fecha: asistencia.fechaEscolar,
      persona: `${asistencia.persona.nombres} ${asistencia.persona.apellidos}`,
      tipo: asistencia.persona.tipo,
      estado: asistencia.estado,
    }));
  }

  async getExcelReport(query: AsistenciaFiltrosQueryDto) {
    const rows = await this.getAsistencias(query);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Asistencias');

    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Persona', key: 'persona', width: 35 },
      { header: 'Tipo', key: 'tipo', width: 18 },
      { header: 'Estado', key: 'estado', width: 18 },
    ];
    worksheet.addRows(rows);
    worksheet.getRow(1).font = { bold: true };

    return workbook.xlsx.writeBuffer();
  }
}
