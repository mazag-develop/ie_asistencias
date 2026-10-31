export interface RespuestaPaginada<T> {
  data: T[];
  paginacion: {
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
  };
}

export function respuestaPaginada<T>(
  data: T[],
  total: number,
  pagina: number,
  limite: number,
): RespuestaPaginada<T> {
  return {
    data,
    paginacion: {
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    },
  };
}
