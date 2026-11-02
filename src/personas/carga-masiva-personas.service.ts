import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import { CargoPersonaDto, TipoPersonaDto } from './dto/crear-persona.dto';
import { PrismaService } from '../prisma/prisma.service';

const COLUMNAS = [
  'codigo',
  'dni',
  'nombres',
  'apellidos',
  'tipo',
  'grado',
  'seccion',
  'cargo',
  'estado',
] as const;
const MAX_FILAS = 1000;

type PersonaImportada = {
  codigo: string;
  dni: string;
  nombres: string;
  apellidos: string;
  tipo: TipoPersonaDto;
  grado: string | null;
  seccion: string | null;
  cargo: CargoPersonaDto | null;
  activo: boolean;
};

type FilaValidada = {
  fila: number;
  persona: PersonaImportada;
};

type ErrorFila = {
  fila: number;
  campo: string;
  mensaje: string;
};

function snapshot(value: object): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class CargaMasivaPersonasService {
  constructor(private readonly prisma: PrismaService) {}

  async generarPlantilla(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Personas');
    worksheet.columns = COLUMNAS.map((key) => ({
      header: key,
      key,
      width: key === 'nombres' || key === 'apellidos' ? 24 : 18,
      style: { numFmt: '@' },
    }));
    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: COLUMNAS.length },
    };
    const instrucciones = workbook.addWorksheet('Instrucciones');
    instrucciones.columns = [
      { header: 'Campo', key: 'campo', width: 18 },
      { header: 'Obligatorio', key: 'obligatorio', width: 22 },
      { header: 'Regla', key: 'regla', width: 70 },
    ];
    instrucciones.getRow(1).font = { bold: true };
    instrucciones.addRows([
      {
        campo: 'codigo',
        obligatorio: 'Sí',
        regla: 'Único; entre 3 y 50 caracteres.',
      },
      {
        campo: 'dni',
        obligatorio: 'Sí',
        regla: 'Único; entre 8 y 20 dígitos.',
      },
      {
        campo: 'nombres',
        obligatorio: 'Sí',
        regla: 'Entre 2 y 100 caracteres.',
      },
      {
        campo: 'apellidos',
        obligatorio: 'Sí',
        regla: 'Entre 2 y 100 caracteres.',
      },
      { campo: 'tipo', obligatorio: 'Sí', regla: 'ESTUDIANTE o PROFESOR.' },
      {
        campo: 'grado',
        obligatorio: 'Estudiantes',
        regla: 'Requerido solo para estudiantes.',
      },
      {
        campo: 'seccion',
        obligatorio: 'Estudiantes',
        regla: 'Requerida solo para estudiantes.',
      },
      {
        campo: 'cargo',
        obligatorio: 'Personal (PROFESOR)',
        regla:
          'DOCENTE, DIRECTOR(A), ADMINISTRATIVO, SECRETARIA(O) o AUXILIAR.',
      },
      {
        campo: 'estado',
        obligatorio: 'No',
        regla: 'HABILITADO o DESHABILITADO; vacío se considera HABILITADO.',
      },
    ]);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async validarArchivo(file: { originalname: string; buffer: Buffer }) {
    const parseo = await this.parsearArchivo(file);
    const filas = parseo.filas;
    const errores = parseo.errores;
    this.validarDuplicadosArchivo(filas, errores);

    if (filas.length > 0) {
      const codigos = filas.map(({ persona }) => persona.codigo);
      const documentos = filas.map(({ persona }) => persona.dni);
      const existentes = await this.prisma.persona.findMany({
        where: {
          OR: [{ codigo: { in: codigos } }, { documento: { in: documentos } }],
        },
        select: { codigo: true, documento: true },
      });
      const codigosExistentes = new Set(
        existentes.map((persona) => persona.codigo),
      );
      const dniExistentes = new Set(
        existentes
          .map((persona) => persona.documento)
          .filter((dni): dni is string => dni !== null),
      );
      for (const { fila, persona } of filas) {
        if (codigosExistentes.has(persona.codigo)) {
          errores.push({
            fila,
            campo: 'codigo',
            mensaje: 'El código ya está registrado',
          });
        }
        if (dniExistentes.has(persona.dni)) {
          errores.push({
            fila,
            campo: 'dni',
            mensaje: 'El DNI ya está registrado',
          });
        }
      }
    }

    const filasConError = new Set(errores.map((error) => error.fila));
    const validas = filas.filter(({ fila }) => !filasConError.has(fila));
    return {
      totalFilas: parseo.totalFilas,
      validas: validas.length,
      rechazadas: parseo.totalFilas - validas.length,
      errores,
      registros: validas.map(({ fila, persona }) => ({ fila, ...persona })),
    };
  }

  async importarArchivo(file: { originalname: string; buffer: Buffer }) {
    const validacion = await this.validarArchivo(file);
    const registros = validacion.registros;
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const registro of registros) {
          const persona = await tx.persona.create({
            data: {
              codigo: registro.codigo,
              documento: registro.dni,
              nombres: registro.nombres,
              apellidos: registro.apellidos,
              tipo: registro.tipo,
              grado: registro.grado,
              seccion: registro.seccion,
              cargo: registro.cargo,
              activo: registro.activo,
            },
          });
          await tx.auditoriaPersona.create({
            data: {
              personaId: persona.id,
              accion: 'CARGA_MASIVA',
              datosNuevos: snapshot(persona),
            },
          });
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Uno o más códigos o DNI ya fueron registrados; vuelva a validar el archivo',
        );
      }
      throw error;
    }

    return {
      totalFilas: validacion.totalFilas,
      creadas: registros.length,
      rechazadas: validacion.rechazadas,
      errores: validacion.errores,
    };
  }

  private async parsearArchivo(file: {
    originalname: string;
    buffer: Buffer;
  }): Promise<{
    filas: FilaValidada[];
    errores: ErrorFila[];
    totalFilas: number;
  }> {
    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException('El archivo debe tener formato .xlsx');
    }

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(
        file.buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
      );
    } catch {
      throw new BadRequestException('No se pudo leer el archivo Excel');
    }
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('El archivo no contiene una hoja de datos');
    }

    const headerRow = worksheet.getRow(1);
    const headers = COLUMNAS.map((_, index) =>
      this.leerCelda(headerRow.getCell(index + 1).value)
        .trim()
        .toLowerCase(),
    );
    if (
      headers.some((header, index) => header !== COLUMNAS[index]) ||
      Array.from(
        { length: Math.max(headerRow.cellCount - COLUMNAS.length, 0) },
        (_, index) =>
          this.leerCelda(
            headerRow.getCell(COLUMNAS.length + index + 1).value,
          ).trim(),
      ).some(Boolean)
    ) {
      throw new BadRequestException(
        `La primera fila debe contener estas columnas en orden: ${COLUMNAS.join(', ')}`,
      );
    }

    const filas: FilaValidada[] = [];
    const errores: ErrorFila[] = [];
    let totalFilas = 0;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const valores = COLUMNAS.map((_, index) =>
        this.leerCelda(row.getCell(index + 1).value).trim(),
      );
      if (valores.every((valor) => !valor)) return;
      totalFilas += 1;
      if (totalFilas > MAX_FILAS) return;
      const tieneColumnasExtra = Array.from(
        { length: Math.max(row.cellCount - COLUMNAS.length, 0) },
        (_, index) =>
          this.leerCelda(row.getCell(COLUMNAS.length + index + 1).value).trim(),
      ).some(Boolean);
      if (tieneColumnasExtra) {
        errores.push({
          fila: rowNumber,
          campo: 'columnas',
          mensaje: 'La fila contiene columnas adicionales a la plantilla',
        });
        return;
      }

      const [
        codigo,
        dni,
        nombres,
        apellidos,
        tipoRaw,
        gradoRaw,
        seccionRaw,
        cargoRaw,
        estadoRaw,
      ] = valores;
      const persona = this.normalizarFila({
        fila: rowNumber,
        codigo,
        dni,
        nombres,
        apellidos,
        tipoRaw,
        gradoRaw,
        seccionRaw,
        cargoRaw,
        estadoRaw,
        errores,
      });
      if (persona) filas.push({ fila: rowNumber, persona });
    });
    if (totalFilas > MAX_FILAS) {
      throw new BadRequestException(
        `El archivo no puede superar ${MAX_FILAS} filas de datos`,
      );
    }
    if (totalFilas === 0) {
      throw new BadRequestException('El archivo no contiene filas de datos');
    }

    return { filas, errores, totalFilas };
  }

  private normalizarFila(datos: {
    fila: number;
    codigo: string;
    dni: string;
    nombres: string;
    apellidos: string;
    tipoRaw: string;
    gradoRaw: string;
    seccionRaw: string;
    cargoRaw: string;
    estadoRaw: string;
    errores: ErrorFila[];
  }): PersonaImportada | null {
    const { fila, errores } = datos;
    const agregarError = (campo: string, mensaje: string) =>
      errores.push({ fila, campo, mensaje });

    for (const campo of ['codigo', 'dni', 'nombres', 'apellidos'] as const) {
      if (!datos[campo]) agregarError(campo, 'El campo es obligatorio');
    }
    if (datos.dni && !/^\d{8,20}$/.test(datos.dni)) {
      agregarError('dni', 'El DNI debe contener entre 8 y 20 dígitos');
    }
    if (datos.codigo.length > 50 || (datos.codigo && datos.codigo.length < 3)) {
      agregarError('codigo', 'El código debe contener entre 3 y 50 caracteres');
    }
    for (const campo of ['nombres', 'apellidos'] as const) {
      if (
        datos[campo] &&
        (datos[campo].length < 2 || datos[campo].length > 100)
      ) {
        agregarError(campo, 'Debe contener entre 2 y 100 caracteres');
      }
    }

    const tipoRaw = datos.tipoRaw.toUpperCase();
    const tipo = Object.values(TipoPersonaDto).find(
      (opcion) => String(opcion) === tipoRaw,
    );
    if (!tipo) {
      agregarError('tipo', 'Debe ser ESTUDIANTE o PROFESOR');
    }
    const cargoRaw = datos.cargoRaw.toUpperCase();
    const cargo = Object.values(CargoPersonaDto).find(
      (opcion) => String(opcion) === cargoRaw,
    );
    let grado: string | null = null;
    let seccion: string | null = null;

    if (tipo === TipoPersonaDto.ESTUDIANTE) {
      grado = datos.gradoRaw || null;
      seccion = datos.seccionRaw || null;
      if (!grado) agregarError('grado', 'El grado es obligatorio');
      if (!seccion) agregarError('seccion', 'La sección es obligatoria');
      if (grado && grado.length > 50) {
        agregarError('grado', 'No puede superar 50 caracteres');
      }
      if (seccion && seccion.length > 20) {
        agregarError('seccion', 'No puede superar 20 caracteres');
      }
      if (cargoRaw) {
        agregarError('cargo', 'El cargo debe estar vacío para estudiantes');
      }
    } else if (tipo === TipoPersonaDto.PROFESOR) {
      if (datos.gradoRaw) {
        agregarError('grado', 'El grado debe estar vacío para el personal');
      }
      if (datos.seccionRaw) {
        agregarError('seccion', 'La sección debe estar vacía para el personal');
      }
      if (!cargo) {
        agregarError('cargo', 'Seleccione un cargo permitido');
      }
    }

    const estado = datos.estadoRaw.toUpperCase();
    if (estado && !['HABILITADO', 'DESHABILITADO'].includes(estado)) {
      agregarError('estado', 'Debe ser HABILITADO o DESHABILITADO');
    }

    if (
      !datos.codigo ||
      !datos.dni ||
      !datos.nombres ||
      !datos.apellidos ||
      !tipo ||
      errores.some((error) => error.fila === fila)
    ) {
      return null;
    }

    return {
      codigo: datos.codigo,
      dni: datos.dni,
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      tipo,
      grado,
      seccion,
      cargo: tipo === TipoPersonaDto.PROFESOR ? (cargo ?? null) : null,
      activo: estado !== 'DESHABILITADO',
    };
  }

  private validarDuplicadosArchivo(
    filas: FilaValidada[],
    errores: ErrorFila[],
  ): void {
    const campos: Array<'codigo' | 'dni'> = ['codigo', 'dni'];
    for (const campo of campos) {
      const primerasFilas = new Map<string, number>();
      for (const { fila, persona } of filas) {
        const valor = persona[campo];
        const filaAnterior = primerasFilas.get(valor);
        if (filaAnterior !== undefined) {
          errores.push({
            fila: filaAnterior,
            campo,
            mensaje: `El valor está duplicado en la fila ${fila}`,
          });
          errores.push({
            fila,
            campo,
            mensaje: `El valor está duplicado en la fila ${filaAnterior}`,
          });
        } else {
          primerasFilas.set(valor, fila);
        }
      }
    }
  }

  private leerCelda(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
    throw new BadRequestException(
      'Use celdas con texto o números; no se permiten fórmulas ni objetos de Excel',
    );
  }
}
