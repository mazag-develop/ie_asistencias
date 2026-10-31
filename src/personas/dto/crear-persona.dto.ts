import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export enum TipoPersonaDto {
  ESTUDIANTE = 'ESTUDIANTE',
  PROFESOR = 'PROFESOR',
}

export class CrearPersonaDto {
  @ApiProperty({ example: 'EST-00001', description: 'Código único de la persona' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  codigo: string;

  @ApiProperty({ example: '12345678', description: 'Documento de identidad', required: false })
  @IsOptional()
  @IsString()
  @Length(8, 20)
  documento?: string;

  @ApiProperty({ example: 'Juan', description: 'Nombres' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  nombres: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellidos' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  apellidos: string;

  @ApiProperty({ enum: TipoPersonaDto, example: TipoPersonaDto.ESTUDIANTE, description: 'Tipo de persona' })
  @IsEnum(TipoPersonaDto)
  tipo: TipoPersonaDto;

  @ApiProperty({ example: true, description: 'Estado de la persona', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
