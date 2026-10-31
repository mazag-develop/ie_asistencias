import { PrismaService } from '../prisma/prisma.service';
import { AsistenciasService } from './asistencias.service';

describe('AsistenciasService.getResumenDiario', () => {
  it('counts active people without attendance as absences and pending', async () => {
    const prisma = {
      persona: {
        count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1),
      },
      asistencia: {
        findMany: jest.fn().mockResolvedValue([
          { estado: 'PUNTUAL', persona: { activo: true } },
          { estado: 'TARDANZA', persona: { activo: true } },
        ]),
      },
    } as unknown as PrismaService;
    const service = new AsistenciasService(prisma);

    await expect(service.getResumenDiario()).resolves.toEqual({
      totalEstudiantes: 2,
      totalProfesores: 1,
      puntualidades: 1,
      tardanzas: 1,
      faltas: 1,
      pendientes: 1,
    });
  });

  describe('AsistenciasService.findAll', () => {
    it('applies pagination and returns the paginated response contract', async () => {
      const records = [{ id: 6 }];
      const prisma = {
        asistencia: {
          findMany: jest.fn().mockResolvedValue(records),
          count: jest.fn().mockResolvedValue(13),
        },
      } as unknown as PrismaService;
      const service = new AsistenciasService(prisma);

      await expect(
        service.findAll({
          pagina: 2,
          limite: 5,
          fechaInicio: '2026-10-01',
          fechaFin: '2026-10-31',
          codigo: 'EST-01',
          persona: 'Ana',
          tipo: 'ESTUDIANTE',
          estado: 'PUNTUAL',
        }),
      ).resolves.toEqual({
        data: records,
        paginacion: {
          total: 13,
          pagina: 2,
          limite: 5,
          totalPaginas: 3,
        },
      });

      expect(prisma.asistencia.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });
  });

  it('applies the requested person type to totals and attendance', async () => {
    const prisma = {
      persona: {
        count: jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(2),
      },
      asistencia: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { estado: 'PUNTUAL', persona: { activo: true } },
          ]),
      },
    } as unknown as PrismaService;
    const service = new AsistenciasService(prisma);

    await expect(service.getResumenDiario('ESTUDIANTE')).resolves.toEqual({
      totalEstudiantes: 3,
      totalProfesores: 0,
      puntualidades: 1,
      tardanzas: 0,
      faltas: 2,
      pendientes: 2,
    });
  });
});
