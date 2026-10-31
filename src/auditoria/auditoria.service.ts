import { Injectable } from '@nestjs/common';

@Injectable()
export class AuditoriaService {
  getEventos() {
    return {
      success: true,
      message: 'Auditoría aún no implementada.',
      data: [],
    };
  }
}
