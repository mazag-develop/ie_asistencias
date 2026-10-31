import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RegistrarScanDto {
  @ApiProperty({ example: 'EST-00001', description: 'Código leído por el escáner' })
  @IsString()
  @IsNotEmpty()
  codigo: string;
}
