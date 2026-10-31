import { respuestaPaginada } from './pagination';

describe('respuestaPaginada', () => {
  it('returns the page and pagination metadata', () => {
    expect(respuestaPaginada([{ id: 11 }], 21, 2, 10)).toEqual({
      data: [{ id: 11 }],
      paginacion: {
        total: 21,
        pagina: 2,
        limite: 10,
        totalPaginas: 3,
      },
    });
  });

  it('reports zero total pages for an empty result', () => {
    expect(respuestaPaginada([], 0, 1, 10).paginacion.totalPaginas).toBe(0);
  });
});
