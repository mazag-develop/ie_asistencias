import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PersonasQueryDto } from '../common/dto/personas-query.dto';
import { respuestaPaginada } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarPersonaDto } from './dto/actualizar-persona.dto';
import { CrearPersonaDto } from './dto/crear-persona.dto';
import {
  DatosPersonaPorTipo,
  validarDatosPorTipo,
} from './personas.validation';

function snapshot(value: object): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function incluirDni<T extends { documento: string | null }>(persona: T) {
  return { ...persona, dni: persona.documento };
}

@Injectable()
export class PersonasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PersonasQueryDto) {
    const codigo = query.codigo?.trim();
    const where: Prisma.PersonaWhereInput = {};
    if (codigo) {
      where.codigo = { contains: codigo, mode: 'insensitive' };
    }
    if (query.tipo) {
      where.tipo = query.tipo;
    }
    const skip = (query.pagina - 1) * query.limite;

    const [data, total] = await Promise.all([
      this.prisma.persona.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limite,
      }),
      this.prisma.persona.count({ where }),
    ]);

    return respuestaPaginada(
      data.map(incluirDni),
      total,
      query.pagina,
      query.limite,
    );
  }

  async findById(id: number) {
    const persona = await this.prisma.persona.findUnique({ where: { id } });
    if (!persona) {
      throw new NotFoundException(`Persona ${id} no encontrada`);
    }

    return incluirDni(persona);
  }

  async findByCodigo(codigo: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { codigo: codigo.trim() },
    });

    if (!persona) {
      throw new NotFoundException('Código de persona no encontrado');
    }

    return incluirDni(persona);
  }

  async create(dto: CrearPersonaDto) {
    const codigo = dto.codigo.trim();
    const documento = this.getDocumento(dto);

    if (!documento) {
      throw new BadRequestException('El DNI es obligatorio');
    }
    validarDatosPorTipo({
      tipo: dto.tipo,
      grado: dto.grado,
      seccion: dto.seccion,
      cargo: dto.cargo,
    });

    const existing = await this.prisma.persona.findUnique({
      where: { codigo },
    });
    if (existing) {
      throw new BadRequestException('El código ya está registrado');
    }
    const documentoDuplicado = await this.prisma.persona.findUnique({
      where: { documento },
    });
    if (documentoDuplicado) {
      throw new BadRequestException('El DNI ya está registrado');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const persona = await tx.persona.create({
          data: {
            codigo,
            documento,
            nombres: dto.nombres.trim(),
            apellidos: dto.apellidos.trim(),
            tipo: dto.tipo,
            activo: dto.activo ?? true,
            grado: dto.grado?.trim(),
            seccion: dto.seccion?.trim(),
            cargo: dto.cargo,
          },
        });
        await tx.auditoriaPersona.create({
          data: {
            personaId: persona.id,
            accion: 'CREAR',
            datosNuevos: snapshot(persona),
          },
        });
        return incluirDni(persona);
      });
    } catch (error) {
      this.convertirDuplicado(error);
    }
  }

  async update(id: number, dto: ActualizarPersonaDto) {
    const current = await this.findById(id);
    if (!dto || Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'Debe enviar al menos un campo para actualizar',
      );
    }

    const documento = this.getDocumento(dto);
    const nuevoTipo = dto.tipo ?? current.tipo;
    const cambiaTipo =
      dto.tipo !== undefined && String(dto.tipo) !== String(current.tipo);
    const tipoEspecificoModificado =
      dto.tipo !== undefined ||
      dto.grado !== undefined ||
      dto.seccion !== undefined ||
      dto.cargo !== undefined;
    const nuevosDatos: DatosPersonaPorTipo = {
      tipo: nuevoTipo,
      grado: dto.grado ?? (cambiaTipo ? null : current.grado),
      seccion: dto.seccion ?? (cambiaTipo ? null : current.seccion),
      cargo: dto.cargo ?? (cambiaTipo ? null : current.cargo),
    };
    if (tipoEspecificoModificado) {
      validarDatosPorTipo(nuevosDatos);
    }

    const codigo = dto.codigo?.trim();
    if (codigo && codigo !== current.codigo) {
      const existing = await this.prisma.persona.findUnique({
        where: { codigo },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('El código ya está registrado');
      }
    }
    if (documento && documento !== current.documento) {
      const existing = await this.prisma.persona.findUnique({
        where: { documento },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('El DNI ya está registrado');
      }
    }

    const updateData: Prisma.PersonaUpdateInput = {
      codigo: codigo || undefined,
      documento: documento || undefined,
      nombres: dto.nombres?.trim() || undefined,
      apellidos: dto.apellidos?.trim() || undefined,
      tipo: dto.tipo,
      activo: dto.activo,
      grado:
        dto.grado !== undefined
          ? dto.grado.trim()
          : cambiaTipo
            ? null
            : undefined,
      seccion:
        dto.seccion !== undefined
          ? dto.seccion.trim()
          : cambiaTipo
            ? null
            : undefined,
      cargo:
        dto.cargo !== undefined ? dto.cargo : cambiaTipo ? null : undefined,
    };

    try {
      return await this.prisma.$transaction(async (tx) => {
        const persona = await tx.persona.update({
          where: { id },
          data: updateData,
        });
        await tx.auditoriaPersona.create({
          data: {
            personaId: id,
            accion: 'ACTUALIZAR',
            datosAnteriores: snapshot(current),
            datosNuevos: snapshot(persona),
          },
        });
        return incluirDni(persona);
      });
    } catch (error) {
      this.convertirDuplicado(error);
    }
  }

  async updateEstado(id: number, activo: boolean) {
    const current = await this.findById(id);
    return this.prisma.$transaction(async (tx) => {
      const persona = await tx.persona.update({
        where: { id },
        data: { activo },
      });
      await tx.auditoriaPersona.create({
        data: {
          personaId: id,
          accion: activo ? 'HABILITAR' : 'DESHABILITAR',
          datosAnteriores: snapshot(current),
          datosNuevos: snapshot(persona),
        },
      });
      return incluirDni(persona);
    });
  }

  private getDocumento(
    dto:
      | Pick<CrearPersonaDto, 'dni' | 'documento'>
      | Pick<ActualizarPersonaDto, 'dni' | 'documento'>,
  ): string | undefined {
    if (dto.dni && dto.documento && dto.dni.trim() !== dto.documento.trim()) {
      throw new BadRequestException('Envíe un solo valor para el DNI');
    }
    return (dto.dni ?? dto.documento)?.trim() || undefined;
  }

  private convertirDuplicado(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BadRequestException('El código o DNI ya está registrado');
    }
    throw error;
  }
}
