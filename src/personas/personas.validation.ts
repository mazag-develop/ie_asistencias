import { BadRequestException } from '@nestjs/common';
import { TipoPersona } from '@prisma/client';
import { CargoPersonaDto, TipoPersonaDto } from './dto/crear-persona.dto';

export type DatosPersonaPorTipo = {
  tipo: TipoPersonaDto | TipoPersona;
  grado?: string | null;
  seccion?: string | null;
  cargo?: string | null;
};

export function validarDatosPorTipo(datos: DatosPersonaPorTipo): void {
  if (datos.tipo === TipoPersonaDto.ESTUDIANTE) {
    if (!datos.grado?.trim() || !datos.seccion?.trim()) {
      throw new BadRequestException(
        'Grado y sección son obligatorios para estudiantes',
      );
    }
    if (datos.cargo) {
      throw new BadRequestException(
        'El cargo solo aplica al personal de la institución',
      );
    }
    return;
  }

  if (datos.grado || datos.seccion) {
    throw new BadRequestException('Grado y sección solo aplican a estudiantes');
  }
  if (
    !datos.cargo ||
    !Object.values(CargoPersonaDto).includes(datos.cargo as CargoPersonaDto)
  ) {
    throw new BadRequestException(
      'El cargo es obligatorio y debe ser un cargo permitido',
    );
  }
}
