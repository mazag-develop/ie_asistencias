import { EstadoAsistencia, TipoPersona } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AsistenciaFiltrosQueryDto {
  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  fechaInicio?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @IsDateString({ strict: true })
  fechaFin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  persona?: string;

  @ApiPropertyOptional({ enum: TipoPersona })
  @IsOptional()
  @IsEnum(TipoPersona)
  tipo?: TipoPersona;

  @ApiPropertyOptional({ enum: EstadoAsistencia })
  @IsOptional()
  @IsEnum(EstadoAsistencia)
  estado?: EstadoAsistencia;
}
