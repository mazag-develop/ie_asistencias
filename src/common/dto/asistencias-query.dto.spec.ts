import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AsistenciasQueryDto } from './asistencias-query.dto';

describe('AsistenciasQueryDto', () => {
  it('defaults pagination and converts query values to numbers', async () => {
    const defaults = plainToInstance(AsistenciasQueryDto, {});
    expect(defaults.pagina).toBe(1);
    expect(defaults.limite).toBe(10);

    const query = plainToInstance(AsistenciasQueryDto, {
      pagina: '2',
      limite: '25',
    });
    expect(query.pagina).toBe(2);
    expect(query.limite).toBe(25);
    await expect(validate(query)).resolves.toHaveLength(0);
  });

  it('rejects invalid date ranges and pagination limits', async () => {
    const query = plainToInstance(AsistenciasQueryDto, {
      pagina: '0',
      limite: '101',
      fechaInicio: '2026-02-31',
    });

    await expect(validate(query)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'pagina' }),
        expect.objectContaining({ property: 'limite' }),
        expect.objectContaining({ property: 'fechaInicio' }),
      ]),
    );
  });
});
