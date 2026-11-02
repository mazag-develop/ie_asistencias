import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PersonasQueryDto } from '../common/dto/personas-query.dto';
import { ActualizarPersonaDto } from './dto/actualizar-persona.dto';
import { ActualizarEstadoPersonaDto } from './dto/actualizar-estado-persona.dto';
import { CrearPersonaDto } from './dto/crear-persona.dto';
import { CargaMasivaPersonasService } from './carga-masiva-personas.service';
import { PersonasService } from './personas.service';

@ApiTags('personas')
@Controller('personas')
export class PersonasController {
  constructor(
    private readonly personasService: PersonasService,
    private readonly cargaMasivaService: CargaMasivaPersonasService,
  ) {}

  @Get()
  getAll(@Query() query: PersonasQueryDto) {
    return this.personasService.findAll(query);
  }

  @Get('codigo/:codigo')
  getByCodigo(@Param('codigo') codigo: string) {
    return this.personasService.findByCodigo(codigo);
  }

  @Get('carga-masiva/plantilla')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async descargarPlantilla(@Res() response: Response) {
    const buffer = await this.cargaMasivaService.generarPlantilla();
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="plantilla-personas.xlsx"',
    );
    response.send(buffer);
  }

  @Post('carga-masiva/validar')
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  validarCargaMasiva(
    @UploadedFile()
    file: { originalname: string; buffer: Buffer } | undefined,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Debe adjuntar el archivo en el campo archivo',
      );
    }
    return this.cargaMasivaService.validarArchivo(file);
  }

  @Post('carga-masiva/importar')
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  importarCargaMasiva(
    @UploadedFile()
    file: { originalname: string; buffer: Buffer } | undefined,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Debe adjuntar el archivo en el campo archivo',
      );
    }
    return this.cargaMasivaService.importarArchivo(file);
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
