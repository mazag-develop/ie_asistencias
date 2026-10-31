import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ActualizarEstadoPersonaDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  activo: boolean;
}
