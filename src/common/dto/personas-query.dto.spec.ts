import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PersonasQueryDto } from './personas-query.dto';

describe('PersonasQueryDto', () => {
  it.each(['ESTUDIANTE', 'PROFESOR'])('accepts tipo=%s', async (tipo) => {
    const query = plainToInstance(PersonasQueryDto, { tipo });

    await expect(validate(query)).resolves.toHaveLength(0);
  });

  it('rejects unsupported person types', async () => {
    const query = plainToInstance(PersonasQueryDto, { tipo: 'ADMINISTRADOR' });

    await expect(validate(query)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'tipo' })]),
    );
  });
});
