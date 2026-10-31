# Contrato HTTP e integración del backend

Este documento consolida el contrato HTTP de la interfaz Angular y el
comportamiento implementado en el backend NestJS.

## Configuración

- Prefijo utilizado: `/api`.
- URL de desarrollo: `http://localhost:3000/api`.
- URL de producción configurada actualmente: `https://localhost:3000/api`.
- El frontend no agrega automáticamente credenciales de autenticación a las solicitudes.
- Los campos opcionales vacíos no se envían como parámetros de consulta.
- Swagger del backend: `http://localhost:3000/api/docs` en desarrollo.
- El backend permite CORS desde `http://localhost:4200`.

Las rutas de las tablas se muestran con el prefijo `/api`.

## Estado actual del backend

El backend usa NestJS 11, TypeScript, PostgreSQL y Prisma 6. El puerto se
configura con `PORT` y, si no se define, es `3000`. Las variables de entorno se
cargan desde `.env`; configurar `DATABASE_URL` sin incluir credenciales en este
documento.

La validación global transforma los DTO, rechaza propiedades no declaradas y
rechaza entradas inválidas. El documento OpenAPI incluye el esquema de
seguridad Bearer, pero no hay una estrategia de autenticación ni guardas
aplicadas a las rutas. El frontend actualmente no envía credenciales.

### Rutas implementadas

| Método  | Ruta                              | Estado y comportamiento actual                                                |
| ------- | --------------------------------- | ----------------------------------------------------------------------------- |
| `GET`   | `/api`                            | Devuelve el texto `Hello World!`.                                             |
| `GET`   | `/api/dashboard`                  | Devuelve métricas actuales y las últimas cinco asistencias.                   |
| `GET`   | `/api/personas`                   | Filtra por código y/o tipo y devuelve resultados paginados.                   |
| `GET`   | `/api/personas/:id`               | Devuelve la persona o `404`.                                                  |
| `GET`   | `/api/personas/codigo/:codigo`    | Busca persona por código.                                                     |
| `POST`  | `/api/personas`                   | Crea una persona y devuelve el registro.                                      |
| `PATCH` | `/api/personas/:id`               | Actualiza campos y devuelve el registro actualizado.                          |
| `PATCH` | `/api/personas/:id/estado`        | Cambia `activo` y devuelve el registro actualizado.                           |
| `POST`  | `/api/asistencias/scan`           | Valida y registra un escaneo, calculando fecha, hora y estado en el servidor. |
| `GET`   | `/api/asistencias`                | Filtra el historial, incluye persona y pagina los resultados.                 |
| `GET`   | `/api/asistencias/diaria`         | Devuelve totales y estados del día, opcionalmente por tipo.                   |
| `GET`   | `/api/asistencias/resumen`        | Devuelve contadores sobre todos los registros, sin filtro diario.             |
| `GET`   | `/api/reportes/asistencias`       | Devuelve filas de reporte y admite filtros.                                   |
| `GET`   | `/api/reportes/asistencias/excel` | Descarga un archivo Excel con los filtros aplicados.                          |
| `GET`   | `/api/auditoria`                  | Marcador de posición: devuelve un objeto con lista `data` vacía.              |

La auditoría persistente sigue sin implementarse.

### Reglas implementadas

- Los códigos de persona son únicos; los documentos, si se proporcionan,
  también son únicos.
- Al crear personas, el servicio recorta espacios en código, documento,
  nombres y apellidos. `activo` es opcional y por defecto `true`.
- El DTO de persona requiere `codigo` (3–50 caracteres), `nombres` y
  `apellidos` (2–100 cada uno) y `tipo` (`ESTUDIANTE` o `PROFESOR`). El
  `documento` opcional debe medir 8–20 caracteres; `activo`, si se envía, debe
  ser booleano.
- En `PATCH /api/personas/:id`, los campos son opcionales, pero se debe enviar
  al menos uno. Enviar `documento` vacío no permite borrarlo: el DTO lo rechaza
  por su longitud mínima.
- Una persona inexistente genera `404`. Los duplicados, una persona inactiva
  al escanear y un cambio sin campos generan `400`.
- El escaneo usa `America/Lima`, deriva `fechaEscolar` de la fecha local y no
  confía en hora o estado enviados por el cliente.
- Estudiantes son puntuales hasta las 07:45 inclusive; profesores hasta las
  07:40 inclusive. Después se registra `TARDANZA`.
- Se permite una asistencia por persona y fecha escolar; el duplicado genera
  `409` y también está protegido por una restricción única en la base de datos.
- En el resumen diario, toda persona activa sin registro de hoy se cuenta como
  falta y pendiente. Este cálculo es virtual: no crea registros `FALTA` en la
  base de datos. Las asistencias que ya tengan estado `FALTA` también se
  contabilizan como faltas.
- El resumen diario cuenta personas activas en `totalEstudiantes` y
  `totalProfesores`; puntualidades y tardanzas incluyen las asistencias del día
  del tipo solicitado (incluso si la persona fue desactivada después de
  registrar). `pendientes` cuenta personas activas sin registro.
- `GET /api/asistencias/resumen` devuelve `total`, `puntual`, `tardanza`,
  `faltas`, `estudiantes` y `profesores`. Cuenta registros de todas las fechas;
  `estudiantes` y `profesores` son asistencias por tipo, no personas únicas.

La respuesta actual del escaneo incluye campos adicionales a los que el
frontend requiere:

```json
{
  "success": true,
  "message": "Asistencia registrada correctamente",
  "data": {
    "persona": "Ana Pérez",
    "tipo": "ESTUDIANTE",
    "hora": "07:30:00",
    "estado": "PUNTUAL",
    "fechaEscolar": "2026-10-30",
    "asistenciaId": 1
  }
}
```

### Modelo de datos actual

| Modelo                       | Campos y restricciones principales                                                                                                                                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Persona` (`personas`)       | `id` entero autoincremental; `codigo` único (50 caracteres); `documento` opcional y único (20); `nombres` y `apellidos` (100 cada uno); `tipo` (`ESTUDIANTE` o `PROFESOR`); `activo` por defecto `true`; `createdAt` y `updatedAt`. Índice por `tipo` y `activo`.                |
| `Asistencia` (`asistencias`) | `id` entero autoincremental; `personaId`; `fechaEscolar` (10); `fechaHora` con zona horaria; `estado` (`PUNTUAL`, `TARDANZA` o `FALTA`); `codigoLeido` opcional (50); `createdAt`. Restricción única por `personaId` y `fechaEscolar`; índices por fecha/estado y persona/fecha. |

Comandos de desarrollo: `npm run start:dev`, `npm run build`,
`npm run start:prod`, `npm test -- --runInBand`, `npm run test:e2e`,
`npx prisma migrate dev` y `npx prisma generate`.

## Resumen de rutas

| Método  | Ruta                              | Uso                                                                   |
| ------- | --------------------------------- | --------------------------------------------------------------------- |
| `GET`   | `/api/dashboard`                  | Datos y métricas para el tablero.                                     |
| `GET`   | `/api/personas`                   | Listar y filtrar personas.                                            |
| `GET`   | `/api/personas/:id`               | Consultar una persona por ID.                                         |
| `GET`   | `/api/personas/codigo/:codigo`    | Consultar persona por código; disponible en el servicio del frontend. |
| `POST`  | `/api/personas`                   | Crear una persona.                                                    |
| `PATCH` | `/api/personas/:id`               | Actualizar datos de una persona.                                      |
| `PATCH` | `/api/personas/:id/estado`        | Activar o desactivar una persona.                                     |
| `POST`  | `/api/asistencias/scan`           | Registrar una asistencia mediante código.                             |
| `GET`   | `/api/asistencias`                | Consultar historial de asistencias.                                   |
| `GET`   | `/api/asistencias/diaria`         | Consultar el resumen de asistencia del día.                           |
| `GET`   | `/api/reportes/asistencias`       | Consultar filas del reporte de asistencias.                           |
| `GET`   | `/api/reportes/asistencias/excel` | Descargar el reporte como archivo Excel.                              |

## Formatos compartidos

### Persona

```json
{
  "id": 1,
  "codigo": "EST-00001",
  "documento": "12345678",
  "nombres": "Ana",
  "apellidos": "Pérez",
  "tipo": "ESTUDIANTE",
  "activo": true,
  "createdAt": "2026-10-30T12:00:00.000Z",
  "updatedAt": "2026-10-30T12:00:00.000Z"
}
```

- `tipo`: `ESTUDIANTE` o `PROFESOR`.
- `documento` puede ser `null` u omitirse si no existe.
- El frontend espera fechas serializadas como cadenas.

### Paginación de personas e historial

`GET /api/personas` y `GET /api/asistencias` aceptan `pagina` y `limite`.
Ambos tienen por defecto página `1` y límite `10`; el límite máximo es `100`.
Una página fuera de rango es válida y devuelve una lista vacía con su metadata.
La respuesta es:

```json
{
  "data": [],
  "paginacion": {
    "total": 0,
    "pagina": 1,
    "limite": 10,
    "totalPaginas": 0
  }
}
```

## Tablero

### `GET /api/dashboard`

Devuelve los contadores del tablero y las últimas asistencias.

```json
{
  "totalPersonas": 0,
  "totalEstudiantes": 0,
  "totalProfesores": 0,
  "asistenciasHoy": 0,
  "puntuales": 0,
  "tardanzas": 0,
  "ausentes": 0,
  "porcentajePuntualidad": 0,
  "fechaConsulta": "2026-10-30",
  "ultimasAsistencias": [
    {
      "id": "1",
      "persona": "Ana Pérez",
      "tipo": "ESTUDIANTE",
      "estado": "PUNTUAL",
      "hora": "07:30:00"
    }
  ]
}
```

`estado` admite `PUNTUAL`, `TARDANZA` o `FALTA`. Los contadores son números y
`fechaConsulta` usa el formato `YYYY-MM-DD`.

El total de personas y sus totales por tipo incluyen personas activas e
inactivas. `asistenciasHoy` cuenta los registros persistidos de hoy;
`ausentes` incluye personas activas sin asistencia y registros existentes con
estado `FALTA`. El porcentaje de puntualidad se calcula sobre las asistencias
del día con estado puntual o tardanza. `ultimasAsistencias` contiene hasta
cinco registros, del más reciente al más antiguo.

## Personas

### `GET /api/personas`

Lista personas en el formato paginado compartido; el orden es por fecha de
creación descendente.

Parámetros de consulta utilizados:

| Parámetro | Tipo   | Descripción                                            |
| --------- | ------ | ------------------------------------------------------ |
| `codigo`  | string | Texto de búsqueda parcial por código.                  |
| `tipo`    | string | `ESTUDIANTE` o `PROFESOR`; filtra por tipo de persona. |
| `pagina`  | entero | Página solicitada; por defecto `1`.                    |
| `limite`  | entero | Resultados por página; por defecto `10`, máximo `100`. |

Ejemplos:

- `GET /api/personas?tipo=ESTUDIANTE`
- `GET /api/personas?tipo=PROFESOR`
- `GET /api/personas?tipo=ESTUDIANTE&pagina=1&limite=10`

Los valores de `tipo` distinguen mayúsculas y minúsculas; cualquier otro valor
se rechaza con `400`.

### `GET /api/personas/:id`

Devuelve un objeto `Persona`. `id` es el identificador de la persona.

### `GET /api/personas/codigo/:codigo`

Devuelve un objeto `Persona` encontrado por su código. Esta operación está
declarada en el servicio API del frontend, aunque no se invoca desde las
pantallas actuales.

### `POST /api/personas`

Crea una persona y devuelve el objeto `Persona` creado.

```json
{
  "codigo": "EST-00001",
  "documento": "12345678",
  "nombres": "Ana",
  "apellidos": "Pérez",
  "tipo": "ESTUDIANTE"
}
```

| Campo       | Tipo                      | Requerido |
| ----------- | ------------------------- | --------: |
| `codigo`    | string                    |        Sí |
| `documento` | string                    |        No |
| `nombres`   | string                    |        Sí |
| `apellidos` | string                    |        Sí |
| `tipo`      | `ESTUDIANTE` o `PROFESOR` |        Sí |

El frontend no envía `activo` al crear; el backend debe aplicar un valor
predeterminado apropiado.

### `PATCH /api/personas/:id`

Actualiza uno o más campos de la persona y devuelve el objeto `Persona`
actualizado. El cuerpo admite los mismos campos que la creación, todos
opcionales.

### `PATCH /api/personas/:id/estado`

Actualiza el estado activo y devuelve el objeto `Persona` actualizado.

```json
{
  "activo": false
}
```

## Asistencias

### `POST /api/asistencias/scan`

Registra la asistencia de la persona asociada al código y devuelve:

```json
{
  "success": true,
  "message": "Asistencia registrada correctamente",
  "data": {
    "persona": "Ana Pérez",
    "tipo": "ESTUDIANTE",
    "hora": "07:30:00",
    "estado": "PUNTUAL"
  }
}
```

Solicitud:

```json
{
  "codigo": "EST-00001"
}
```

El frontend solo envía `codigo`; fecha, hora y estado deben ser determinados
por el backend.

### `GET /api/asistencias`

Devuelve registros de asistencia en el formato paginado compartido, ordenados
por `fechaHora` descendente. Cada registro incluye `id`, `personaId`,
`fechaEscolar`, `fechaHora`, `estado`, `codigoLeido` y la persona relacionada
(`persona`), con formato Persona.

Parámetros de consulta enviados por la pantalla de historial:

| Parámetro     | Tipo         | Descripción                                            |
| ------------- | ------------ | ------------------------------------------------------ |
| `fechaInicio` | `YYYY-MM-DD` | Fecha inicial del filtro.                              |
| `fechaFin`    | `YYYY-MM-DD` | Fecha final del filtro.                                |
| `codigo`      | string       | Código de la persona o código leído.                   |
| `persona`     | string       | Texto para filtrar por persona.                        |
| `tipo`        | string       | `ESTUDIANTE` o `PROFESOR`.                             |
| `estado`      | string       | `PUNTUAL`, `TARDANZA` o `FALTA`.                       |
| `pagina`      | entero       | Página solicitada; por defecto `1`.                    |
| `limite`      | entero       | Resultados por página; por defecto `10`, máximo `100`. |

### `GET /api/asistencias/diaria`

Devuelve el resumen diario:

```json
{
  "totalEstudiantes": 0,
  "totalProfesores": 0,
  "puntualidades": 0,
  "tardanzas": 0,
  "faltas": 0,
  "pendientes": 0
}
```

Admite el parámetro opcional `tipo` (`ESTUDIANTE` o `PROFESOR`). Sin este
parámetro, devuelve los totales de ambos tipos. `pendientes` es el número de
personas activas sin registro de hoy; bajo la regla acordada, esas mismas
personas también se cuentan como `faltas`. El cálculo no escribe faltas en la
base de datos. Registros existentes con estado `FALTA` se suman al contador de
faltas, pero no al de pendientes.

## Reportes

Los dos endpoints reciben los mismos parámetros opcionales:

| Parámetro     | Tipo         | Descripción                          |
| ------------- | ------------ | ------------------------------------ |
| `fechaInicio` | `YYYY-MM-DD` | Fecha inicial.                       |
| `fechaFin`    | `YYYY-MM-DD` | Fecha final.                         |
| `codigo`      | string       | Código de la persona o código leído. |
| `tipo`        | string       | `ESTUDIANTE` o `PROFESOR`.           |
| `estado`      | string       | `PUNTUAL`, `TARDANZA` o `FALTA`.     |
| `persona`     | string       | Texto para filtrar por persona.      |

### `GET /api/reportes/asistencias`

Devuelve un arreglo JSON. Cada elemento incluye los campos de la tabla:

```json
[
  {
    "fecha": "2026-10-30",
    "persona": "Ana Pérez",
    "tipo": "ESTUDIANTE",
    "estado": "PUNTUAL"
  }
]
```

### `GET /api/reportes/asistencias/excel`

Devuelve el contenido binario del archivo Excel (`.xlsx`) con las columnas
`Fecha`, `Persona`, `Tipo` y `Estado`; el nombre de descarga es
`reporte-asistencias.xlsx`.

## Compatibilidad con la documentación existente

La tabla confirma cómo queda atendido el contrato del frontend:

| Operación           | Contrato esperado por el frontend                                                   | Backend actual                                                                   | Notas                                                                           |
| ------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Tablero             | `GET /api/dashboard` con métricas y últimas asistencias.                            | Implementado; las últimas cinco y los contadores se calculan con datos actuales. | `ausentes` cuenta personas activas sin registro y registros existentes `FALTA`. |
| Lista de personas   | `GET /api/personas?codigo=...`, respuesta paginada.                                 | Implementada; página 1, límite 10 por defecto, límite máximo 100.                | Compatible.                                                                     |
| Persona por código  | `GET /api/personas/codigo/:codigo`.                                                 | Implementado.                                                                    | Compatible.                                                                     |
| Crear persona       | El frontend envía código, documento, nombres, apellidos y tipo; espera una persona. | Compatible; también admite `activo` opcional.                                    | Sin diferencia esencial para el cuerpo descrito.                                |
| Actualizar estado   | `PATCH /api/personas/:id/estado` con `{ "activo": boolean }`.                       | Implementado y valida que `activo` sea booleano.                                 | Compatible.                                                                     |
| Escanear asistencia | `POST /api/asistencias/scan`; el frontend espera persona, tipo, hora y estado.      | Devuelve esos campos, además de `fechaEscolar` y `asistenciaId`.                 | Respuesta compatible con campos adicionales.                                    |
| Historial           | `GET /api/asistencias` con filtros y respuesta paginada.                            | Implementado con todos los filtros documentados y paginación.                    | Compatible.                                                                     |
| Resumen diario      | `GET /api/asistencias/diaria`, opcionalmente filtrado por tipo.                     | Implementado con la regla acordada para faltas y pendientes.                     | Compatible; faltas y pendientes no se persisten como filas automáticas.         |
| Reporte JSON        | `GET /api/reportes/asistencias` con filtros; el frontend espera un arreglo.         | Implementado; devuelve filas con fecha, persona, tipo y estado.                  | Compatible.                                                                     |
| Reporte Excel       | `GET /api/reportes/asistencias/excel`; el frontend espera bytes `.xlsx`.            | Implementado como archivo binario con nombre `reporte-asistencias.xlsx`.         | Compatible.                                                                     |
| Auditoría           | No figura entre las rutas esperadas del frontend.                                   | `GET /api/auditoria` devuelve una respuesta de marcador de posición.             | La auditoría persistente no está implementada.                                  |

## Respuestas de error del backend

NestJS responde con el código HTTP de cada excepción y un objeto de error.
Casos de negocio documentados en el código:

- `404`: persona inexistente o código de escaneo desconocido.
- `400`: código/documento duplicado, persona inactiva al escanear, solicitud
  inválida o actualización sin campos.
- `409`: asistencia duplicada para persona y fecha escolar.
- `400`: DTO inválido o con propiedades no permitidas.

## Referencias del proyecto

- Esquema de base de datos: `prisma/schema.prisma`.
- Configuración de prefijo, validación, CORS y Swagger: `src/main.ts`.
- Controladores y servicios: `src/personas/`, `src/asistencias/`,
  `src/reportes/` y `src/auditoria/`.
- Las variables locales van en `.env`; no incluir sus valores en documentación
  versionada.
