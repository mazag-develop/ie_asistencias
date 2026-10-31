import { InternalServerErrorException, Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import { AsistenciasService } from '../asistencias/asistencias.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly asistenciasService: AsistenciasService,
  ) {}

  async getSummary() {
    const fechaConsulta = DateTime.now().setZone('America/Lima').toISODate();
    if (!fechaConsulta) {
      throw new InternalServerErrorException(
        'No se pudo determinar la fecha local',
      );
    }

    const [
      totalPersonas,
      totalEstudiantes,
      totalProfesores,
      asistenciasHoy,
      resumen,
      asistencias,
    ] = await Promise.all([
      this.prisma.persona.count(),
      this.prisma.persona.count({ where: { tipo: 'ESTUDIANTE' } }),
      this.prisma.persona.count({ where: { tipo: 'PROFESOR' } }),
      this.prisma.asistencia.count({
        where: { fechaEscolar: fechaConsulta },
      }),
      this.asistenciasService.getResumenDiario(),
      this.prisma.asistencia.findMany({
        include: { persona: true },
        orderBy: { fechaHora: 'desc' },
        take: 5,
      }),
    ]);

    const asistenciasRegistradas = resumen.puntualidades + resumen.tardanzas;

    return {
      totalPersonas,
      totalEstudiantes,
      totalProfesores,
      asistenciasHoy,
      puntuales: resumen.puntualidades,
      tardanzas: resumen.tardanzas,
      ausentes: resumen.faltas,
      porcentajePuntualidad:
        asistenciasRegistradas === 0
          ? 0
          : Math.round(
              (resumen.puntualidades / asistenciasRegistradas) * 10000,
            ) / 100,
      fechaConsulta,
      ultimasAsistencias: asistencias.map((asistencia) => ({
        id: String(asistencia.id),
        persona: `${asistencia.persona.nombres} ${asistencia.persona.apellidos}`,
        tipo: asistencia.persona.tipo,
        estado: asistencia.estado,
        hora: DateTime.fromJSDate(asistencia.fechaHora, {
          zone: 'America/Lima',
        }).toFormat('HH:mm:ss'),
      })),
    };
  }
}
