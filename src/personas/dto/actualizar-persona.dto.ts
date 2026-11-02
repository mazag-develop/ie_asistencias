import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { CargoPersonaDto, TipoPersonaDto } from './crear-persona.dto';

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
  @Matches(/^\d{8,20}$/)
  dni?: string;

  @ApiProperty({ example: '12345678', required: false, deprecated: true })
  @IsOptional()
  @IsString()
  @Length(8, 20)
  @Matches(/^\d{8,20}$/)
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

  @ApiProperty({
    enum: TipoPersonaDto,
    example: TipoPersonaDto.ESTUDIANTE,
    required: false,
  })
  @IsOptional()
  @IsEnum(TipoPersonaDto)
  tipo?: TipoPersonaDto;

  @ApiProperty({ example: '5to', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  grado?: string;

  @ApiProperty({ example: 'A', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  seccion?: string;

  @ApiProperty({ enum: CargoPersonaDto, required: false })
  @IsOptional()
  @IsEnum(CargoPersonaDto)
  cargo?: CargoPersonaDto;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
