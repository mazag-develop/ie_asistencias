import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoPersona } from '@prisma/client';
import { PersonasQueryDto } from '../common/dto/personas-query.dto';
import { respuestaPaginada } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarPersonaDto } from './dto/actualizar-persona.dto';
import { CrearPersonaDto } from './dto/crear-persona.dto';

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

    return respuestaPaginada(data, total, query.pagina, query.limite);
  }

  async findById(id: number) {
    const persona = await this.prisma.persona.findUnique({ where: { id } });
    if (!persona) {
      throw new NotFoundException(`Persona ${id} no encontrada`);
    }

    return persona;
  }

  async findByCodigo(codigo: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { codigo: codigo.trim() },
    });

    if (!persona) {
      throw new NotFoundException('Código de persona no encontrado');
    }

    return persona;
  }

  async create(dto: CrearPersonaDto) {
    const codigo = dto.codigo.trim();
    const documento = dto.documento?.trim();

    const existing = await this.prisma.persona.findUnique({
      where: { codigo },
    });
    if (existing) {
      throw new BadRequestException('El código ya está registrado');
    }

    if (documento) {
      const documentoDuplicado = await this.prisma.persona.findUnique({
        where: { documento },
      });
      if (documentoDuplicado) {
        throw new BadRequestException('El documento ya está registrado');
      }
    }

    return this.prisma.persona.create({
      data: {
        codigo,
        documento,
        nombres: dto.nombres.trim(),
        apellidos: dto.apellidos.trim(),
        tipo: dto.tipo as TipoPersona,
        activo: dto.activo ?? true,
      },
    });
  }

  async update(id: number, dto: ActualizarPersonaDto) {
    const current = await this.findById(id);

    if (!dto || Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'Debe enviar al menos un campo para actualizar',
      );
    }

    if (dto.codigo && dto.codigo.trim() !== current.codigo) {
      const existing = await this.prisma.persona.findUnique({
        where: { codigo: dto.codigo.trim() },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('El código ya está registrado');
      }
    }

    if (dto.documento && dto.documento.trim() !== current.documento) {
      const existing = await this.prisma.persona.findUnique({
        where: { documento: dto.documento.trim() },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('El documento ya está registrado');
      }
    }

    const updateData: Prisma.PersonaUpdateInput = {
      codigo: dto.codigo ? dto.codigo.trim() : undefined,
      documento:
        dto.documento !== undefined ? dto.documento.trim() || null : undefined,
      nombres: dto.nombres ? dto.nombres.trim() : undefined,
      apellidos: dto.apellidos ? dto.apellidos.trim() : undefined,
      tipo: dto.tipo ? (dto.tipo as TipoPersona) : undefined,
      activo: dto.activo !== undefined ? dto.activo : undefined,
    };

    return this.prisma.persona.update({
      where: { id },
      data: updateData,
    });
  }

  async updateEstado(id: number, activo: boolean) {
    await this.findById(id);
    return this.prisma.persona.update({
      where: { id },
      data: { activo },
    });
  }
}
