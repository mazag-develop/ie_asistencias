import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PersonasService } from './personas.service';
import type { CreatePersonaDto, Persona, UpdatePersonaDto } from '../prisma/prisma.service';

@Controller('personas')
export class PersonasController {
  constructor(private readonly personasService: PersonasService) {}

  @Get()
  getAll(): Persona[] {
    return this.personasService.findAll();
  }

  @Get(':id')
  getById(@Param('id') id: string): Persona {
    return this.personasService.findById(Number(id));
  }

  @Post()
  create(@Body() dto: CreatePersonaDto): Persona {
    return this.personasService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePersonaDto): Persona {
    return this.personasService.update(Number(id), dto);
  }
}
