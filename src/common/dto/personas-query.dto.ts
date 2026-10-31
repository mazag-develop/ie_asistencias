import { TipoPersona } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class PersonasQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Búsqueda parcial por código de persona',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigo?: string;

  @ApiPropertyOptional({ enum: TipoPersona })
  @IsOptional()
  @IsEnum(TipoPersona)
  tipo?: TipoPersona;
}
