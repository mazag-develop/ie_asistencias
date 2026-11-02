import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { ReportesService } from './reportes.service';

describe('ReportesService', () => {
  const asistencia = {
    fechaEscolar: '2026-10-30',
    fechaHora: new Date('2026-10-30T12:30:45.000Z'),
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
        hora: '07:30:45',
        persona: 'Ana Pérez',
        tipo: 'ESTUDIANTE',
        estado: 'PUNTUAL',
        estadoCodigo: 'P',
        estadoDescripcion: 'Presente - asistió puntual',
      },
    ]);
  });

  it.each([
    ['PUNTUAL', 'P', 'Presente - asistió puntual'],
    ['TARDANZA', 'T', 'Tardanza'],
    ['FALTA', 'F', 'Falta'],
  ] as const)(
    'maps %s to report code %s',
    async (estado, estadoCodigo, estadoDescripcion) => {
      const { prisma, service } = createService();
      (prisma.asistencia.findMany as jest.Mock).mockResolvedValue([
        { ...asistencia, estado },
      ]);

      const [row] = await service.getAsistencias({});

      expect(row).toMatchObject({
        estado,
        estadoCodigo,
        estadoDescripcion,
      });
      expect(row.hora).toBe(estado === 'FALTA' ? '' : '07:30:45');
    },
  );

  it('generates a valid Excel workbook with report rows', async () => {
    const { service } = createService();
    const bytes = await service.getExcelReport({});
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes);

    const worksheet = workbook.getWorksheet('Asistencias');
    expect(worksheet?.getRow(1).values).toEqual([
      undefined,
      'Fecha',
      'Hora',
      'Persona',
      'Tipo',
      'Estado',
      'Código',
      'Descripción',
    ]);
    expect(worksheet?.getRow(2).values).toEqual([
      undefined,
      '2026-10-30',
      '07:30:45',
      'Ana Pérez',
      'ESTUDIANTE',
      'PUNTUAL',
      'P',
      'Presente - asistió puntual',
    ]);
  });
});
