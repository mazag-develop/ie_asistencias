import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  Matches,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';

export enum TipoPersonaDto {
  ESTUDIANTE = 'ESTUDIANTE',
  PROFESOR = 'PROFESOR',
}

export enum CargoPersonaDto {
  DOCENTE = 'DOCENTE',
  DIRECTOR = 'DIRECTOR(A)',
  ADMINISTRATIVO = 'ADMINISTRATIVO',
  SECRETARIA = 'SECRETARIA(O)',
  AUXILIAR = 'AUXILIAR',
}

export class CrearPersonaDto {
  @ApiProperty({
    example: 'EST-00001',
    description: 'Código único de la persona',
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  codigo: string;

  @ApiProperty({
    example: '12345678',
    description:
      'DNI obligatorio; se acepta documento como alias por compatibilidad',
    required: true,
  })
  @IsOptional()
  @IsString()
  @Length(8, 20)
  @Matches(/^\d{8,20}$/)
  dni?: string;

  @ApiProperty({
    example: '12345678',
    description: 'Alias legado de dni',
    required: false,
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  @Length(8, 20)
  @Matches(/^\d{8,20}$/)
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

  @ApiProperty({
    enum: TipoPersonaDto,
    example: TipoPersonaDto.ESTUDIANTE,
    description: 'Tipo de persona',
  })
  @IsEnum(TipoPersonaDto)
  tipo: TipoPersonaDto;

  @ApiProperty({ example: '5to', required: false })
  @ValidateIf(
    (persona: CrearPersonaDto) => persona.tipo === TipoPersonaDto.ESTUDIANTE,
  )
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  grado?: string;

  @ApiProperty({ example: 'A', required: false })
  @ValidateIf(
    (persona: CrearPersonaDto) => persona.tipo === TipoPersonaDto.ESTUDIANTE,
  )
  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  seccion?: string;

  @ApiProperty({ enum: CargoPersonaDto, required: false })
  @ValidateIf(
    (persona: CrearPersonaDto) => persona.tipo === TipoPersonaDto.PROFESOR,
  )
  @IsEnum(CargoPersonaDto)
  cargo?: CargoPersonaDto;

  @ApiProperty({
    example: true,
    description: 'Estado de la persona',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
