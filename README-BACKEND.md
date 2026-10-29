# Backend — Sistema de Asistencia Escolar

## 1. Descripción del proyecto

Backend para un sistema de control de asistencia de estudiantes y profesores mediante un lector USB de códigos de barras o QR.

El sistema registra automáticamente la entrada, calcula la puntualidad, evita registros duplicados, permite consultar el historial y prepara la información para generar reportes en Excel.

### Tecnologías

- **NestJS:** API REST.
- **PostgreSQL:** base de datos relacional.
- **Prisma ORM:** acceso a la base de datos y migraciones.
- **Luxon:** manejo de fechas y zona horaria.
- **ExcelJS:** generación de reportes Excel, en una fase posterior.
- **Zona horaria:** `America/Lima`.

## 2. Reglas de negocio

| Regla | Descripción |
|---|---|
| Estudiantes | Puntual hasta las 07:45 a. m., inclusive. |
| Profesores | Puntual hasta las 07:40 a. m., inclusive. |
| Tardanza | Registro posterior a la hora límite correspondiente. |
| Código desconocido | No se registra la asistencia. |
| Persona inactiva | Se rechaza el registro. |
| Duplicados | Una sola asistencia por persona y día escolar. |
| Faltas | Se generan al cerrar el día de asistencia según la política del colegio. |
| Correcciones | Solo usuarios autorizados y con auditoría. |

**Importante:** la hora oficial, la fecha escolar y el estado de asistencia se calculan en el backend. Angular no debe enviar un estado de puntualidad calculado por el navegador.

## 3. Estructura del proyecto

```text
asistencia-api/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── personas/
│   │   ├── personas.module.ts
│   │   ├── personas.service.ts
│   │   └── personas.controller.ts
│   ├── asistencias/
│   │   ├── asistencias.module.ts
│   │   ├── asistencias.service.ts
│   │   └── asistencias.controller.ts
│   ├── reportes/
│   ├── auditoria/
│   ├── app.module.ts
│   └── main.ts
├── .env
├── .gitignore
└── package.json
```

## 4. Requisitos previos

Instalar:

- Node.js en una versión compatible con NestJS.
- npm.
- NestJS CLI.
- PostgreSQL.
- Visual Studio Code, recomendado.

Verificar las instalaciones:

```powershell
node -v
npm -v
psql --version
nest --version
```

## 5. Crear el proyecto

Desde PowerShell:

```powershell
mkdir sistema-asistencia
cd sistema-asistencia

npm install -g @nestjs/cli
nest new asistencia-api

cd asistencia-api
```

Seleccionar `npm` como gestor de paquetes cuando NestJS lo solicite.

Instalar dependencias:

```powershell
npm install @nestjs/config
npm install class-validator class-transformer
npm install luxon
npm install @prisma/client
npm install -D prisma @types/luxon
```

## 6. Crear la base de datos

Desde pgAdmin o `psql`, ejecutar:

```sql
CREATE DATABASE asistencia_escolar;
```

Inicializar Prisma:

```powershell
npx prisma init
```

Configurar `DATABASE_URL` en el archivo `.env`:

```dotenv
DATABASE_URL="postgresql://postgres:TU_CLAVE@localhost:5432/asistencia_escolar?schema=public"
```

Reemplazar `TU_CLAVE` por la contraseña real. No subir el archivo `.env` a Git ni compartir credenciales.

## 7. Modelo de datos

Editar `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TipoPersona {
  ESTUDIANTE
  PROFESOR
}

enum EstadoAsistencia {
  PUNTUAL
  TARDANZA
  FALTA
}

model Persona {
  id        Int         @id @default(autoincrement())
  codigo    String      @unique @db.VarChar(100)
  documento String?     @unique @db.VarChar(20)
  nombres   String      @db.VarChar(150)
  apellidos String      @db.VarChar(150)
  tipo      TipoPersona
  activo    Boolean     @default(true)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  asistencias Asistencia[]

  @@index([apellidos, nombres])
}

model Asistencia {
  id           BigInt           @id @default(autoincrement())
  personaId    Int
  fechaEscolar String           @db.VarChar(10)
  fechaHora    DateTime         @db.Timestamptz(3)
  estado       EstadoAsistencia
  codigoLeido  String           @db.VarChar(100)
  createdAt    DateTime         @default(now())

  persona Persona @relation(
    fields: [personaId],
    references: [id],
    onDelete: Restrict
  )

  @@unique([personaId, fechaEscolar])
  @@index([fechaEscolar, estado])
}
```

La restricción única por persona y fecha escolar protege contra duplicados, incluso cuando se reciben solicitudes simultáneas.

## 8. Crear las tablas

```powershell
npx prisma migrate dev --name inicial
npx prisma generate
```

Si la migración termina correctamente, las tablas estarán creadas en PostgreSQL.

## 9. Generar los módulos de NestJS

```powershell
nest g module prisma
nest g service prisma

nest g module personas
nest g service personas
nest g controller personas

nest g module asistencias
nest g service asistencias
nest g controller asistencias
```

## 10. Endpoints previstos

| Método | Endpoint | Función |
|---|---|---|
| POST | `/asistencias/scan` | Registrar asistencia a partir del código leído. |
| GET | `/asistencias` | Consultar historial y aplicar filtros. |
| GET | `/asistencias/resumen` | Obtener estadísticas de asistencia. |
| GET | `/personas` | Consultar personas registradas. |
| POST | `/personas` | Crear una persona autorizadamente. |
| PATCH | `/personas/:id` | Actualizar o desactivar una persona. |
| GET | `/reportes/asistencias/excel` | Descargar un reporte Excel. |

### Ejemplo de solicitud de escaneo

```json
{
  "codigo": "EST-000123"
}
```

El backend debe identificar a la persona por su código. No debe aceptar desde el cliente el tipo de persona, la hora oficial ni el estado de puntualidad como valores confiables.

## 11. Registro automático del lector USB

El lector USB puede funcionar como un teclado y escribir el código en Angular.

Flujo esperado:

1. Angular recibe el código.
2. Detecta el final de la lectura.
3. Envía automáticamente el código al endpoint `/asistencias/scan`.
4. NestJS valida el código y la persona.
5. NestJS determina la fecha y hora usando `America/Lima`.
6. El servicio calcula puntualidad o tardanza.
7. Prisma guarda la asistencia.
8. La pantalla muestra el resultado y queda preparada para el siguiente escaneo.

Si el lector no envía Enter, Angular puede detectar el final del código tras una breve pausa. El intervalo debe probarse con el equipo real. Para evitar pérdida de lecturas consecutivas, el frontend debe mantener una cola y el backend debe protegerse contra duplicados.

## 12. Seguridad y controles

- Validar los datos recibidos en cada endpoint.
- Calcular la hora en el servidor.
- Rechazar códigos desconocidos y personas inactivas.
- Usar restricciones únicas y transacciones para evitar duplicados.
- Proteger la administración de personas con autenticación y permisos.
- Registrar correcciones administrativas y sus motivos.
- No guardar contraseñas ni secretos en el frontend.
- Configurar copias de seguridad de PostgreSQL.
- Usar HTTPS en producción.
- Definir el cierre del día antes de generar faltas automáticamente.

## 13. Plan de desarrollo

- [ ] Crear el proyecto NestJS.
- [ ] Configurar PostgreSQL.
- [ ] Configurar Prisma y ejecutar migraciones.
- [ ] Implementar `PrismaService`.
- [ ] Implementar registro y consulta de personas.
- [ ] Implementar el endpoint de escaneo.
- [ ] Calcular puntualidad y tardanza.
- [ ] Evitar registros duplicados.
- [ ] Implementar historial y resumen.
- [ ] Implementar el cierre del día y las faltas.
- [ ] Implementar exportación a Excel.
- [ ] Probar escaneos rápidos, errores de red y códigos desconocidos.
- [ ] Configurar autenticación, permisos y auditoría para producción.

## 14. Decisiones pendientes

Antes de completar la lógica de las faltas, definir:

1. ¿A qué hora se cierra el día escolar para generar las faltas?
2. Si una persona llega después del cierre, ¿se registra tardanza, se conserva la falta o se registra la llegada tardía manteniendo la falta original?
3. ¿Qué marca y modelo de lector USB se utilizará?
4. ¿Cada estudiante y profesor tiene un código único?
5. ¿El backend se ejecutará en una computadora local o en un servidor compartido?

## 15. Comprobar el backend

Ejecutar:

```powershell
npm run start:dev
```

La API de NestJS normalmente estará disponible en:

```text
http://localhost:3000
```

El siguiente paso será implementar `PrismaService` y el endpoint funcional `POST /asistencias/scan`.
