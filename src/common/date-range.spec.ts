import { BadRequestException } from '@nestjs/common';
import { filtroFechaEscolar } from './date-range';

describe('filtroFechaEscolar', () => {
  it('creates an inclusive date range', () => {
    expect(filtroFechaEscolar('2026-10-01', '2026-10-31')).toEqual({
      gte: '2026-10-01',
      lte: '2026-10-31',
    });
  });

  it('rejects a range whose start is after its end', () => {
    expect(() => filtroFechaEscolar('2026-11-01', '2026-10-31')).toThrow(
      BadRequestException,
    );
  });
});
