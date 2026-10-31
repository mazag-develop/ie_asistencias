import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoAsistencia, TipoPersona } from '@prisma/client';
import { DateTime } from 'luxon';
import { construirFiltroAsistencia } from '../common/asistencia-where';
import { AsistenciasQueryDto } from '../common/dto/asistencias-query.dto';
import { respuestaPaginada } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrarScanDto } from './dto/registrar-scan.dto';

export interface ResumenAsistencia {
  total: number;
  puntual: number;
  tardanza: number;
  faltas: number;
  estudiantes: number;
  profesores: number;
}

export interface ResumenAsistenciaDiaria {
  totalEstudiantes: number;
  totalProfesores: number;
  puntualidades: number;
  tardanzas: number;
  faltas: number;
  pendientes: number;
}

@Injectable()
export class AsistenciasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AsistenciasQueryDto) {
    const where = construirFiltroAsistencia(query);
    const skip = (query.pagina - 1) * query.limite;
    const [data, total] = await Promise.all([
      this.prisma.asistencia.findMany({
        where,
        include: { persona: true },
        orderBy: { fechaHora: 'desc' },
        skip,
        take: query.limite,
      }),
      this.prisma.asistencia.count({ where }),
    ]);

    return respuestaPaginada(data, total, query.pagina, query.limite);
  }

  async getResumen(): Promise<ResumenAsistencia> {
    const asistencias = await this.prisma.asistencia.findMany({
      include: { persona: true },
    });

    const summary: ResumenAsistencia = {
      total: asistencias.length,
      puntual: 0,
      tardanza: 0,
      faltas: 0,
      estudiantes: 0,
      profesores: 0,
    };

    for (const asistencia of asistencias) {
      if (asistencia.estado === 'PUNTUAL') summary.puntual += 1;
      if (asistencia.estado === 'TARDANZA') summary.tardanza += 1;
      if (asistencia.estado === 'FALTA') summary.faltas += 1;

      if (asistencia.persona.tipo === 'ESTUDIANTE') summary.estudiantes += 1;
      if (asistencia.persona.tipo === 'PROFESOR') summary.profesores += 1;
    }

    return summary;
  }

  async getResumenDiario(tipo?: TipoPersona): Promise<ResumenAsistenciaDiaria> {
    const fechaEscolar = DateTime.now().setZone('America/Lima').toISODate();
    if (!fechaEscolar) {
      throw new BadRequestException(
        'No se pudo determinar la fecha escolar actual',
      );
    }

    const [estudiantes, profesores, asistencias] = await Promise.all([
      this.prisma.persona.count({
        where: { activo: true, tipo: 'ESTUDIANTE' },
      }),
      this.prisma.persona.count({
        where: { activo: true, tipo: 'PROFESOR' },
      }),
      this.prisma.asistencia.findMany({
        where: {
          fechaEscolar,
          persona: {
            is: {
              ...(tipo ? { tipo } : {}),
            },
          },
        },
        select: { estado: true, persona: { select: { activo: true } } },
      }),
    ]);

    const totalEstudiantes = tipo === 'PROFESOR' ? 0 : estudiantes;
    const totalProfesores = tipo === 'ESTUDIANTE' ? 0 : profesores;
    const totalActivos = totalEstudiantes + totalProfesores;
    const registrosActivos = asistencias.filter(
      (asistencia) => asistencia.persona.activo,
    ).length;
    const pendientes = Math.max(totalActivos - registrosActivos, 0);
    const faltasRegistradas = asistencias.filter(
      (asistencia) => asistencia.estado === 'FALTA',
    ).length;

    return {
      totalEstudiantes,
      totalProfesores,
      puntualidades: asistencias.filter(
        (asistencia) => asistencia.estado === 'PUNTUAL',
      ).length,
      tardanzas: asistencias.filter(
        (asistencia) => asistencia.estado === 'TARDANZA',
      ).length,
      faltas: faltasRegistradas + pendientes,
      pendientes,
    };
  }

  async scan(codigoOrDto: string | RegistrarScanDto) {
    const codigo =
      typeof codigoOrDto === 'string' ? codigoOrDto : codigoOrDto?.codigo;

    if (!codigo) {
      throw new BadRequestException('Debe enviar un código de asistencia');
    }

    const persona = await this.prisma.persona.findUnique({
      where: { codigo: codigo.trim() },
    });

    if (!persona) {
      throw new NotFoundException('Código desconocido');
    }

    if (!persona.activo) {
      throw new BadRequestException('Persona inactiva');
    }

    const ahora = DateTime.now().setZone('America/Lima');
    const fechaEscolar = this.getFechaEscolar(ahora.toJSDate());

    const asistenciaExistente = await this.prisma.asistencia.findUnique({
      where: {
        personaId_fechaEscolar: {
          personaId: persona.id,
          fechaEscolar,
        },
      },
    });

    if (asistenciaExistente) {
      throw new ConflictException(
        'La persona ya tiene registrada una asistencia para este día escolar',
      );
    }

    const estado = this.getEstadoByHora(persona.tipo, ahora.toJSDate());

    const asistencia = await this.prisma.asistencia.create({
      data: {
        personaId: persona.id,
        fechaEscolar,
        fechaHora: ahora.toJSDate(),
        estado,
        codigoLeido: codigo.trim(),
      },
    });

    return {
      success: true,
      message: 'Asistencia registrada correctamente',
      data: {
        persona: `${persona.nombres} ${persona.apellidos}`,
        tipo: persona.tipo,
        hora: ahora.toFormat('HH:mm:ss'),
        estado,
        fechaEscolar,
        asistenciaId: asistencia.id,
      },
    };
  }

  private getFechaEscolar(date: Date): string {
    return (
      DateTime.fromJSDate(date, { zone: 'America/Lima' }).toISODate() ?? ''
    );
  }

  private getEstadoByHora(tipo: TipoPersona, date: Date): EstadoAsistencia {
    const hora = DateTime.fromJSDate(date, { zone: 'America/Lima' });
    const minutosTotales = hora.hour * 60 + hora.minute;
    const limite = tipo === 'ESTUDIANTE' ? 7 * 60 + 45 : 7 * 60 + 40;

    return minutosTotales <= limite ? 'PUNTUAL' : 'TARDANZA';
  }
}
