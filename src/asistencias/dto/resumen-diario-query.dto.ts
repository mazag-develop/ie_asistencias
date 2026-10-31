import { TipoPersona } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class ResumenDiarioQueryDto {
  @ApiPropertyOptional({ enum: TipoPersona })
  @IsOptional()
  @IsEnum(TipoPersona)
  tipo?: TipoPersona;
}
