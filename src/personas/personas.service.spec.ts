import { PrismaService } from '../prisma/prisma.service';
import { PersonasService } from './personas.service';

describe('PersonasService.findAll', () => {
  it('filters by type, code, and pagination', async () => {
    const records = [{ id: 2, codigo: 'EST-00002' }];
    const prisma = {
      persona: {
        findMany: jest.fn().mockResolvedValue(records),
        count: jest.fn().mockResolvedValue(6),
      },
    } as unknown as PrismaService;
    const service = new PersonasService(prisma);

    await expect(
      service.findAll({
        tipo: 'ESTUDIANTE',
        codigo: ' EST- ',
        pagina: 2,
        limite: 5,
      }),
    ).resolves.toEqual({
      data: records,
      paginacion: {
        total: 6,
        pagina: 2,
        limite: 5,
        totalPaginas: 2,
      },
    });

    expect(prisma.persona.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          codigo: { contains: 'EST-', mode: 'insensitive' },
          tipo: 'ESTUDIANTE',
        },
        skip: 5,
        take: 5,
      }),
    );
    expect(prisma.persona.count).toHaveBeenCalledWith({
      where: {
        codigo: { contains: 'EST-', mode: 'insensitive' },
        tipo: 'ESTUDIANTE',
      },
    });
  });
});
