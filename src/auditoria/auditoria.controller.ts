import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditoriaService } from './auditoria.service';

@ApiTags('auditoria')
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  getEventos() {
    return this.auditoriaService.getEventos();
  }
}
