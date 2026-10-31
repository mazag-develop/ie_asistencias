import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { ReportesService } from './reportes.service';

describe('ReportesService', () => {
  const asistencia = {
    fechaEscolar: '2026-10-30',
    persona: {
      nombres: 'Ana',
      apellidos: 'Pérez',
      tipo: 'ESTUDIANTE',
    },
    estado: 'PUNTUAL',
  };

  function createService() {
    const prisma = {
      asistencia: {
        findMany: jest.fn().mockResolvedValue([asistencia]),
      },
    } as unknown as PrismaService;

    return {
      prisma,
      service: new ReportesService(prisma),
    };
  }

  it('returns report rows in the frontend shape', async () => {
    const { service } = createService();

    await expect(service.getAsistencias({})).resolves.toEqual([
      {
        fecha: '2026-10-30',
        persona: 'Ana Pérez',
        tipo: 'ESTUDIANTE',
        estado: 'PUNTUAL',
      },
    ]);
  });

  it('generates a valid Excel workbook with report rows', async () => {
    const { service } = createService();
    const bytes = await service.getExcelReport({});
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes);

    const worksheet = workbook.getWorksheet('Asistencias');
    expect(worksheet?.getRow(1).values).toEqual([
      undefined,
      'Fecha',
      'Persona',
      'Tipo',
      'Estado',
    ]);
    expect(worksheet?.getRow(2).values).toEqual([
      undefined,
      '2026-10-30',
      'Ana Pérez',
      'ESTUDIANTE',
      'PUNTUAL',
    ]);
  });
});
