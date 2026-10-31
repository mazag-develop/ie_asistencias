import { Prisma } from '@prisma/client';
import { filtroFechaEscolar } from './date-range';
import { AsistenciaFiltrosQueryDto } from './dto/asistencia-filtros-query.dto';

export function construirFiltroAsistencia(
  query: AsistenciaFiltrosQueryDto,
): Prisma.AsistenciaWhereInput {
  const conditions: Prisma.AsistenciaWhereInput[] = [];
  const fechaEscolar = filtroFechaEscolar(query.fechaInicio, query.fechaFin);
  const codigo = query.codigo?.trim();
  const persona = query.persona?.trim();

  if (fechaEscolar) {
    conditions.push({ fechaEscolar });
  }
  if (codigo) {
    conditions.push({
      OR: [
        { codigoLeido: { contains: codigo, mode: 'insensitive' } },
        {
          persona: {
            is: { codigo: { contains: codigo, mode: 'insensitive' } },
          },
        },
      ],
    });
  }
  if (persona) {
    for (const termino of persona.split(/\s+/)) {
      conditions.push({
        persona: {
          is: {
            OR: [
              { nombres: { contains: termino, mode: 'insensitive' } },
              { apellidos: { contains: termino, mode: 'insensitive' } },
              { codigo: { contains: termino, mode: 'insensitive' } },
            ],
          },
        },
      });
    }
  }
  if (query.tipo) {
    conditions.push({ persona: { is: { tipo: query.tipo } } });
  }
  if (query.estado) {
    conditions.push({ estado: query.estado });
  }

  return conditions.length ? { AND: conditions } : {};
}
