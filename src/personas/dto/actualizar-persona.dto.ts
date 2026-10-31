import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';

export enum TipoPersonaUpdateDto {
  ESTUDIANTE = 'ESTUDIANTE',
  PROFESOR = 'PROFESOR',
}

export class ActualizarPersonaDto {
  @ApiProperty({ example: 'EST-00001', required: false })
  @IsOptional()
  @IsString()
  @Length(3, 50)
  codigo?: string;

  @ApiProperty({ example: '12345678', required: false })
  @IsOptional()
  @IsString()
  @Length(8, 20)
  documento?: string;

  @ApiProperty({ example: 'Juan', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  nombres?: string;

  @ApiProperty({ example: 'Pérez', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  apellidos?: string;

  @ApiProperty({ enum: TipoPersonaUpdateDto, example: TipoPersonaUpdateDto.ESTUDIANTE, required: false })
  @IsOptional()
  @IsEnum(TipoPersonaUpdateDto)
  tipo?: TipoPersonaUpdateDto;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
