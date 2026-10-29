import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, type Asistencia, type EstadoAsistencia, type ScanAsistenciaDto, type TipoPersona } from '../prisma/prisma.service';

export interface ResumenAsistencia {
  total: number;
  puntual: number;
  tardanza: number;
  faltas: number;
  estudiantes: number;
  profesores: number;
}

@Injectable()
export class AsistenciasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Asistencia[] {
    return this.prisma.findAllAsistencias();
  }

  getResumen(): ResumenAsistencia {
    return this.prisma.getResumenAsistencias();
  }

  scan(codigoOrDto: string | ScanAsistenciaDto): {
    id: number;
    personaId: number;
    codigo: string;
    nombreCompleto: string;
    tipo: TipoPersona;
    fechaEscolar: string;
    fechaHora: Date;
    estado: EstadoAsistencia;
    mensaje: string;
  } {
    const codigo = typeof codigoOrDto === 'string' ? codigoOrDto : codigoOrDto?.codigo;

    if (!codigo) {
      throw new BadRequestException('Debe enviar un código de asistencia');
    }

    const persona = this.prisma.findPersonaByCodigo(codigo);
    if (!persona) {
      throw new NotFoundException('Código desconocido');
    }

    if (!persona.activo) {
      throw new BadRequestException('Persona inactiva');
    }

    const fechaEscolar = this.getFechaEscolar(new Date());
    const asistenciaExistente = this.prisma.findAsistenciaByPersonaAndDate(persona.id, fechaEscolar);
    if (asistenciaExistente) {
      throw new ConflictException('La persona ya tiene registrada una asistencia para este día escolar');
    }

    const estado = this.getEstadoByHora(persona.tipo, new Date());
    const asistencia = this.prisma.createAsistencia({
      personaId: persona.id,
      fechaEscolar,
      fechaHora: new Date(),
      estado,
      codigoLeido: codigo,
    });

    return {
      id: asistencia.id,
      personaId: persona.id,
      codigo: persona.codigo,
      nombreCompleto: `${persona.nombres} ${persona.apellidos}`,
      tipo: persona.tipo,
      fechaEscolar: asistencia.fechaEscolar,
      fechaHora: asistencia.fechaHora,
      estado: asistencia.estado,
      mensaje:
        estado === 'PUNTUAL'
          ? 'Asistencia registrada como puntual.'
          : 'Asistencia registrada como tardanza.',
    };
  }

  private getFechaEscolar(date: Date): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    return formatter.format(date);
  }

  private getEstadoByHora(tipo: TipoPersona, date: Date): EstadoAsistencia {
    const horaLima = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);

    const [hours, minutes] = horaLima.split(':').map(Number);
    const minutosTotales = (hours || 0) * 60 + (minutes || 0);
    const limite = tipo === 'ESTUDIANTE' ? 7 * 60 + 45 : 7 * 60 + 40;

    return minutosTotales <= limite ? 'PUNTUAL' : 'TARDANZA';
  }
}
