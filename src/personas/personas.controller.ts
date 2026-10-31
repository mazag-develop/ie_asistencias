import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PersonasQueryDto } from '../common/dto/personas-query.dto';
import { ActualizarPersonaDto } from './dto/actualizar-persona.dto';
import { ActualizarEstadoPersonaDto } from './dto/actualizar-estado-persona.dto';
import { CrearPersonaDto } from './dto/crear-persona.dto';
import { PersonasService } from './personas.service';

@ApiTags('personas')
@Controller('personas')
export class PersonasController {
  constructor(private readonly personasService: PersonasService) {}

  @Get()
  getAll(@Query() query: PersonasQueryDto) {
    return this.personasService.findAll(query);
  }

  @Get('codigo/:codigo')
  getByCodigo(@Param('codigo') codigo: string) {
    return this.personasService.findByCodigo(codigo);
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.personasService.findById(id);
  }

  @Post()
  create(@Body() dto: CrearPersonaDto) {
    return this.personasService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarPersonaDto,
  ) {
    return this.personasService.update(id, dto);
  }

  @Patch(':id/estado')
  updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarEstadoPersonaDto,
  ) {
    return this.personasService.updateEstado(id, dto.activo);
  }
}
