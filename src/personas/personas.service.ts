import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, type CreatePersonaDto, type Persona, type UpdatePersonaDto } from '../prisma/prisma.service';

@Injectable()
export class PersonasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Persona[] {
    return this.prisma.findAllPersonas();
  }

  findById(id: number): Persona {
    const persona = this.prisma.findPersonaById(id);
    if (!persona) {
      throw new NotFoundException(`Persona ${id} no encontrada`);
    }

    return persona;
  }

  findByCodigo(codigo: string): Persona {
    const persona = this.prisma.findPersonaByCodigo(codigo);
    if (!persona) {
      throw new NotFoundException('Código de persona no encontrado');
    }

    return persona;
  }

  create(dto: CreatePersonaDto): Persona {
    if (!dto?.codigo || !dto?.nombres || !dto?.apellidos || !dto?.tipo) {
      throw new BadRequestException('Faltan datos obligatorios para crear la persona');
    }

    return this.prisma.createPersona(dto);
  }

  update(id: number, dto: UpdatePersonaDto): Persona {
    if (!dto || Object.keys(dto).length === 0) {
      throw new BadRequestException('Debe enviar al menos un campo para actualizar');
    }

    return this.prisma.updatePersona(id, dto);
  }
}
