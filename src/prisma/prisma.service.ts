import { Injectable } from '@nestjs/common';

export type TipoPersona = 'ESTUDIANTE' | 'PROFESOR';
export type EstadoAsistencia = 'PUNTUAL' | 'TARDANZA' | 'FALTA';

export interface Persona {
  id: number;
  codigo: string;
  documento?: string;
  nombres: string;
  apellidos: string;
  tipo: TipoPersona;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Asistencia {
  id: number;
  personaId: number;
  fechaEscolar: string;
  fechaHora: Date;
  estado: EstadoAsistencia;
  codigoLeido: string;
  createdAt: Date;
}

export interface CreatePersonaDto {
  codigo: string;
  documento?: string;
  nombres: string;
  apellidos: string;
  tipo: TipoPersona;
  activo?: boolean;
}

export interface UpdatePersonaDto {
  codigo?: string;
  documento?: string;
  nombres?: string;
  apellidos?: string;
  tipo?: TipoPersona;
  activo?: boolean;
}

export interface ScanAsistenciaDto {
  codigo: string;
}

@Injectable()
export class PrismaService {
  private readonly personas: Persona[] = [
    {
      id: 1,
      codigo: 'EST-000123',
      documento: '12345678',
      nombres: 'Ana',
      apellidos: 'García',
      tipo: 'ESTUDIANTE',
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      codigo: 'PROF-0007',
      documento: '87654321',
      nombres: 'Luis',
      apellidos: 'Pérez',
      tipo: 'PROFESOR',
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      codigo: 'EST-000999',
      documento: '00000000',
      nombres: 'Pedro',
      apellidos: 'Muñoz',
      tipo: 'ESTUDIANTE',
      activo: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  private readonly asistencias: Asistencia[] = [];

  findAllPersonas(): Persona[] {
    return this.personas.map((persona) => ({ ...persona }));
  }

  findPersonaById(id: number): Persona | undefined {
    return this.personas.find((persona) => persona.id === id);
  }

  findPersonaByCodigo(codigo: string): Persona | undefined {
    return this.personas.find(
      (persona) => persona.codigo.trim().toLowerCase() === codigo.trim().toLowerCase(),
    );
  }

  createPersona(dto: CreatePersonaDto): Persona {
    const nextId = this.personas.reduce((maxId, persona) => Math.max(maxId, persona.id), 0) + 1;
    const now = new Date();
    const persona: Persona = {
      id: nextId,
      codigo: dto.codigo,
      documento: dto.documento,
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      tipo: dto.tipo,
      activo: dto.activo ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.personas.push(persona);
    return { ...persona };
  }

  updatePersona(id: number, dto: UpdatePersonaDto): Persona {
    const index = this.personas.findIndex((persona) => persona.id === id);
    if (index === -1) {
      throw new Error(`Persona ${id} no encontrada`);
    }

    const current = this.personas[index];
    const updatedPersona: Persona = {
      ...current,
      codigo: dto.codigo ?? current.codigo,
      documento: dto.documento ?? current.documento,
      nombres: dto.nombres ?? current.nombres,
      apellidos: dto.apellidos ?? current.apellidos,
      tipo: dto.tipo ?? current.tipo,
      activo: dto.activo ?? current.activo,
      updatedAt: new Date(),
    };

    this.personas[index] = updatedPersona;
    return { ...updatedPersona };
  }

  findAllAsistencias(): Asistencia[] {
    return this.asistencias.map((asistencia) => ({ ...asistencia, fechaHora: new Date(asistencia.fechaHora) }));
  }

  findAsistenciaByPersonaAndDate(personaId: number, fechaEscolar: string): Asistencia | undefined {
    return this.asistencias.find(
      (asistencia) => asistencia.personaId === personaId && asistencia.fechaEscolar === fechaEscolar,
    );
  }

  createAsistencia(asistencia: Omit<Asistencia, 'id' | 'createdAt'>): Asistencia {
    const nextId = this.asistencias.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;
    const created: Asistencia = {
      ...asistencia,
      id: nextId,
      createdAt: new Date(),
    };

    this.asistencias.push(created);
    return { ...created, fechaHora: new Date(created.fechaHora) };
  }

  getResumenAsistencias(): {
    total: number;
    puntual: number;
    tardanza: number;
    faltas: number;
    estudiantes: number;
    profesores: number;
  } {
    const summary = { total: 0, puntual: 0, tardanza: 0, faltas: 0, estudiantes: 0, profesores: 0 };

    for (const asistencia of this.asistencias) {
      summary.total += 1;
      if (asistencia.estado === 'PUNTUAL') summary.puntual += 1;
      if (asistencia.estado === 'TARDANZA') summary.tardanza += 1;
      if (asistencia.estado === 'FALTA') summary.faltas += 1;

      const persona = this.findPersonaById(asistencia.personaId);
      if (persona?.tipo === 'ESTUDIANTE') summary.estudiantes += 1;
      if (persona?.tipo === 'PROFESOR') summary.profesores += 1;
    }

    return summary;
  }
}
