import { DateTime } from 'luxon';
import { AsistenciasService } from '../asistencias/asistencias.service';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService.getSummary', () => {
  it('returns dashboard metrics and the latest attendance shape', async () => {
    const prisma = {
      persona: {
        count: jest
          .fn()
          .mockResolvedValueOnce(10)
          .mockResolvedValueOnce(6)
          .mockResolvedValueOnce(4),
      },
      asistencia: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 8,
            fechaHora: new Date('2026-10-30T12:30:00.000Z'),
            estado: 'PUNTUAL',
            persona: {
              nombres: 'Ana',
              apellidos: 'Pérez',
              tipo: 'ESTUDIANTE',
            },
          },
        ]),
      },
    } as unknown as PrismaService;
    const resumenDiario = {
      getResumenDiario: jest.fn().mockResolvedValue({
        totalEstudiantes: 5,
        totalProfesores: 2,
        puntualidades: 1,
        tardanzas: 2,
        faltas: 4,
        pendientes: 4,
      }),
    } as unknown as AsistenciasService;
    const service = new DashboardService(prisma, resumenDiario);

    const result = await service.getSummary();

    expect(result).toEqual({
      totalPersonas: 10,
      totalEstudiantes: 6,
      totalProfesores: 4,
      asistenciasHoy: 3,
      puntuales: 1,
      tardanzas: 2,
      ausentes: 4,
      porcentajePuntualidad: 33.33,
      fechaConsulta: DateTime.now().setZone('America/Lima').toISODate(),
      ultimasAsistencias: [
        {
          id: '8',
          persona: 'Ana Pérez',
          tipo: 'ESTUDIANTE',
          estado: 'PUNTUAL',
          hora: '07:30:00',
        },
      ],
    });
  });
});
