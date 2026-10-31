import { IntersectionType } from '@nestjs/swagger';
import { PaginationQueryDto } from './pagination-query.dto';
import { AsistenciaFiltrosQueryDto } from './asistencia-filtros-query.dto';

export class AsistenciasQueryDto extends IntersectionType(
  PaginationQueryDto,
  AsistenciaFiltrosQueryDto,
) {}
