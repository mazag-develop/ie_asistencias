import { construirFiltroAsistencia } from './asistencia-where';

describe('construirFiltroAsistencia', () => {
  it('combines date, code, person, type, and state filters', () => {
    expect(
      construirFiltroAsistencia({
        fechaInicio: '2026-10-01',
        fechaFin: '2026-10-31',
        codigo: 'EST-01',
        persona: 'Ana',
        tipo: 'ESTUDIANTE',
        estado: 'TARDANZA',
      }),
    ).toEqual({
      AND: [
        { fechaEscolar: { gte: '2026-10-01', lte: '2026-10-31' } },
        {
          OR: [
            { codigoLeido: { contains: 'EST-01', mode: 'insensitive' } },
            {
              persona: {
                is: { codigo: { contains: 'EST-01', mode: 'insensitive' } },
              },
            },
          ],
        },
        {
          persona: {
            is: {
              OR: [
                { nombres: { contains: 'Ana', mode: 'insensitive' } },
                { apellidos: { contains: 'Ana', mode: 'insensitive' } },
                { codigo: { contains: 'Ana', mode: 'insensitive' } },
              ],
            },
          },
        },
        { persona: { is: { tipo: 'ESTUDIANTE' } } },
        { estado: 'TARDANZA' },
      ],
    });
  });
});
