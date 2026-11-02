import { Module } from '@nestjs/common';
import { CargaMasivaPersonasService } from './carga-masiva-personas.service';
import { PersonasController } from './personas.controller';
import { PersonasService } from './personas.service';

@Module({
  controllers: [PersonasController],
  providers: [PersonasService, CargaMasivaPersonasService],
  exports: [PersonasService],
})
export class PersonasModule {}
