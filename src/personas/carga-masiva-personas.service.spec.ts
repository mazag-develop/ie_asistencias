import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { CargaMasivaPersonasService } from './carga-masiva-personas.service';

async function crearArchivo(
  filas: Array<Array<string>>,
): Promise<{ originalname: string; buffer: Buffer }> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Personas');
  worksheet.addRow([
    'codigo',
    'dni',
    'nombres',
    'apellidos',
    'tipo',
    'grado',
    'seccion',
    'cargo',
    'estado',
  ]);
  filas.forEach((fila) => worksheet.addRow(fila));
  return {
    originalname: 'personas.xlsx',
    buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
  };
}

describe('CargaMasivaPersonasService', () => {
  it('generates a downloadable Excel workbook', async () => {
    const prisma = {} as unknown as PrismaService;
    const service = new CargaMasivaPersonasService(prisma);

    const buffer = await service.generarPlantilla();

    expect(buffer.subarray(0, 2).toString()).toBe('PK');
  });

  it('previews valid records and reports row-specific validation errors', async () => {
    const prisma = {
      persona: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const service = new CargaMasivaPersonasService(prisma);
    const file = await crearArchivo([
      [
        'EST-00001',
        '12345678',
        'Ana',
        'Pérez',
        'ESTUDIANTE',
        '5to',
        'A',
        '',
        '',
      ],
      [
        'EST-00002',
        '12345679',
        'Luis',
        'García',
        'ESTUDIANTE',
        '5to',
        '',
        '',
        '',
      ],
    ]);

    await expect(service.validarArchivo(file)).resolves.toMatchObject({
      totalFilas: 2,
      validas: 1,
      rechazadas: 1,
      errores: [
        {
          fila: 3,
          campo: 'seccion',
          mensaje: 'La sección es obligatoria',
        },
      ],
      registros: [
        {
          fila: 2,
          codigo: 'EST-00001',
          dni: '12345678',
          tipo: 'ESTUDIANTE',
          activo: true,
        },
      ],
    });
  });

  it('imports valid rows and records a bulk audit event in the same transaction', async () => {
    const persona = { id: 1, codigo: 'PER-00001' };
    const auditData: Array<{ personaId: number; accion: string }> = [];
    const auditCreate = jest.fn(
      (args: {
        data: {
          personaId: number;
          accion: string;
          datosNuevos: unknown;
        };
      }) => {
        auditData.push(args.data);
        return Promise.resolve({});
      },
    );
    const tx = {
      persona: { create: jest.fn().mockResolvedValue(persona) },
      auditoriaPersona: { create: auditCreate },
    };
    const prisma = {
      persona: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    } as unknown as PrismaService;
    const service = new CargaMasivaPersonasService(prisma);
    const file = await crearArchivo([
      [
        'PER-00001',
        '87654321',
        'Sofía',
        'Gómez',
        'PROFESOR',
        '',
        '',
        'SECRETARIA(O)',
        '',
      ],
    ]);

    await expect(service.importarArchivo(file)).resolves.toMatchObject({
      totalFilas: 1,
      creadas: 1,
      rechazadas: 0,
      errores: [],
    });
    expect(tx.persona.create).toHaveBeenCalledWith({
      data: {
        codigo: 'PER-00001',
        documento: '87654321',
        nombres: 'Sofía',
        apellidos: 'Gómez',
        tipo: 'PROFESOR',
        grado: null,
        seccion: null,
        cargo: 'SECRETARIA(O)',
        activo: true,
      },
    });
    expect(
      auditData.map(({ personaId, accion }) => ({ personaId, accion })),
    ).toEqual([{ personaId: 1, accion: 'CARGA_MASIVA' }]);
  });
});
