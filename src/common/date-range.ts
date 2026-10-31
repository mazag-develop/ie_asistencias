import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function filtroFechaEscolar(
  fechaInicio?: string,
  fechaFin?: string,
): Prisma.StringFilter | undefined {
  if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
    throw new BadRequestException(
      'fechaInicio no puede ser posterior a fechaFin',
    );
  }

  if (!fechaInicio && !fechaFin) {
    return undefined;
  }

  return {
    ...(fechaInicio ? { gte: fechaInicio } : {}),
    ...(fechaFin ? { lte: fechaFin } : {}),
  };
}
