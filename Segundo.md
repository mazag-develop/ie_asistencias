# Backend – Sistema de Asistencia Escolar

## 1. Objetivo

Configurar el backend del Sistema de Asistencia Escolar utilizando:

- NestJS
- Node.js
- TypeScript
- PostgreSQL 17
- Docker
- Prisma ORM 6
- REST API
- ExcelJS (para reportes en una fase posterior)

El backend será responsable de gestionar personas, registrar asistencias, validar códigos leídos por el escáner y generar reportes.

## 2. Arquitectura

```text
SISTEMA DE ASISTENCIA
│
├── Frontend
│   └── Angular 19 Standalone
│
├── Backend
│   └── NestJS
│       ├── Personas
│       ├── Asistencias
│       ├── Reportes
│       ├── Auditoria
│       └── Prisma
│
└── Base de datos
    └── PostgreSQL 17
        └── Docker
            └── Ubuntu Server
```

### Datos de conexión

| Parámetro | Valor |
|---|---|
| Motor | PostgreSQL |
| Versión | 17 Alpine |
| Base de datos | sso_auth_db |
| Usuario | mazag |
| Servidor | 192.168.0.7 |
| Puerto | 5432 |
| ORM | Prisma 6 |
| Zona horaria | America/Lima |

La IP debe coincidir con la dirección real configurada en Ubuntu Server.

## 3. Crear el proyecto NestJS

Desde Windows PowerShell:

```powershell
npm install -g @nestjs/cli
nest new asistencia-backend
```

Seleccionar npm como gestor de paquetes.

Ingresar al proyecto:

```powershell
cd asistencia-backend
```

Ejecutar:

```powershell
npm run start:dev
```

Por defecto, NestJS estará disponible en:

```text
http://localhost:3000
```

## 4. Instalar dependencias

```powershell
npm install @nestjs/config
npm install @nestjs/swagger
npm install class-validator class-transformer
npm install luxon
npm install @prisma/client@6
npm install exceljs
```

Instalar Prisma CLI:

```powershell
npm install prisma@6 --save-dev
npm install @types/luxon --save-dev
```

## 5. Configurar variables de entorno

Crear el archivo `.env` en la raíz del proyecto:

```dotenv
PORT=3000

DATABASE_URL="postgresql://mazag:TU_CLAVE_SEGURA@192.168.0.7:5432/sso_auth_db?schema=public"

TZ=America/Lima
```

Reemplazar `TU_CLAVE_SEGURA` por la contraseña configurada en PostgreSQL.

Si contiene caracteres especiales, codificarlos para la URL de conexión.

Crear también `.env.example`:

```dotenv
PORT=3000
DATABASE_URL="postgresql://USUARIO:CLAVE@HOST:5432/BASE_DATOS?schema=public"
TZ=America/Lima
```

No subir `.env` al repositorio Git.

Verificar que `.gitignore` contenga:

```gitignore
.env
.env.*
!.env.example
```

## 6. Inicializar Prisma 6

Ejecutar:

```powershell
npx prisma init
```

Se generará:

```text
prisma/
└── schema.prisma
```

Configurar `prisma/schema.prisma`:

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
  codigo    String      @unique @db.VarChar(50)
  documento String?     @unique @db.VarChar(20)
  nombres   String      @db.VarChar(100)
  apellidos String      @db.VarChar(100)
  tipo      TipoPersona
  activo    Boolean     @default(true)

  asistencias Asistencia[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tipo, activo])
  @@map("personas")
}

model Asistencia {
  id          BigInt           @id @default(autoincrement())
  personaId   Int
  fechaEscolar String          @db.VarChar(10)
  fechaHora   DateTime         @db.Timestamptz(3)
  estado      EstadoAsistencia
  codigoLeido String?          @db.VarChar(50)

  persona Persona @relation(fields: [personaId], references: [id])

  createdAt DateTime @default(now())

  @@unique([personaId, fechaEscolar])
  @@index([fechaEscolar, estado])
  @@index([personaId, fechaEscolar])
  @@map("asistencias")
}
```

La restricción `@@unique([personaId, fechaEscolar])` impide registrar más de una asistencia por persona en el mismo día escolar.

## 7. Crear la primera migración

Ejecutar:

```powershell
npx prisma format
npx prisma migrate dev --name init
npx prisma generate
```

Verificar la base de datos:

```powershell
npx prisma studio
```

Prisma Studio permite visualizar los registros y tablas desde el navegador.

## 8. Estructura del proyecto

Organizar el backend de esta manera:

```text
src/
│
├── main.ts
├── app.module.ts
│
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
│
├── personas/
│   ├── personas.module.ts
│   ├── personas.controller.ts
│   ├── personas.service.ts
│   └── dto/
│       ├── crear-persona.dto.ts
│       └── actualizar-persona.dto.ts
│
├── asistencias/
│   ├── asistencias.module.ts
│   ├── asistencias.controller.ts
│   ├── asistencias.service.ts
│   └── dto/
│       └── registrar-scan.dto.ts
│
├── reportes/
│   ├── reportes.module.ts
│   ├── reportes.controller.ts
│   └── reportes.service.ts
│
└── auditoria/
    ├── auditoria.module.ts
    ├── auditoria.service.ts
    └── auditoria.controller.ts
```

## 9. Configurar PrismaService

Archivo: `src/prisma/prisma.service.ts`

```typescript
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';

import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

Archivo: `src/prisma/prisma.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

## 10. Configurar el módulo principal

Archivo: `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    PrismaModule,
  ],
})
export class AppModule {}
```

## 11. Configurar main.ts

Archivo: `src/main.ts`

```typescript
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: ['http://localhost:4200'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('API Sistema de Asistencia')
    .setDescription('API para gestionar asistencia escolar')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;

  await app.listen(port, '0.0.0.0');

  console.log(`Backend ejecutándose en http://localhost:${port}`);
  console.log(`Swagger disponible en http://localhost:${port}/api/docs`);
}

bootstrap();
```

En producción, restringir CORS al dominio real del frontend.

## 12. Reglas de negocio de asistencia

### Estudiantes

| Hora de registro | Estado |
|---|---|
| Hasta 07:45:00 | PUNTUAL |
| Después de 07:45:00 | TARDANZA |

### Profesores

| Hora de registro | Estado |
|---|---|
| Hasta 07:40:00 | PUNTUAL |
| Después de 07:40:00 | TARDANZA |

### Consideraciones

1. El backend determina la hora oficial de registro.
2. La zona horaria de negocio será `America/Lima`.
3. Cada persona tendrá una sola asistencia por día escolar.
4. No se registrarán salidas.
5. Las ausencias se generarán mediante un proceso de cierre diario, según la política institucional.
6. No se marcará automáticamente como falta al inicio de la jornada.
7. Los códigos desconocidos o asociados a personas inactivas serán rechazados.
8. El backend debe manejar las lecturas duplicadas de forma segura.

## 13. Endpoints previstos

### Personas

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/personas` | Listar personas |
| GET | `/api/personas/:id` | Consultar persona |
| POST | `/api/personas` | Registrar persona |
| PATCH | `/api/personas/:id` | Actualizar persona |
| PATCH | `/api/personas/:id/estado` | Activar o desactivar |

### Asistencias

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/asistencias/scan` | Registrar lectura |
| GET | `/api/asistencias` | Consultar asistencias |
| GET | `/api/asistencias/resumen` | Resumen diario |
| GET | `/api/asistencias/:id` | Consultar detalle |

### Reportes

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/reportes/asistencias` | Consultar reporte |
| GET | `/api/reportes/asistencias/excel` | Descargar Excel |

## 14. Registro de asistencia mediante escáner

El lector USB se comportará normalmente como un teclado.

El frontend Angular enviará:

```json
{
  "codigo": "EST-00001"
}
```

Endpoint:

```http
POST /api/asistencias/scan
```

Respuesta de ejemplo:

```json
{
  "success": true,
  "message": "Asistencia registrada correctamente",
  "data": {
    "persona": "Juan Pérez",
    "tipo": "ESTUDIANTE",
    "hora": "07:42:15",
    "estado": "PUNTUAL"
  }
}
```

El backend debe:

- Buscar la persona por código.
- Validar que esté activa.
- Obtener la fecha y hora oficial.
- Determinar si corresponde PUNTUAL o TARDANZA.
- Registrar la asistencia.
- Manejar duplicados por la restricción única de persona y fecha.

La validación y el registro deben realizarse de forma segura en el backend, no confiar en la hora o el estado enviados por Angular.

## 15. Configuración de zona horaria

Utilizar:

```typescript
const ZONA_HORARIA = 'America/Lima';
```

Para obtener la fecha escolar y clasificar la hora se recomienda utilizar Luxon.

Ejemplo:

```typescript
import { DateTime } from 'luxon';

const ahora = DateTime.now().setZone('America/Lima');

const fechaEscolar = ahora.toISODate();

const hora = ahora.toFormat('HH:mm:ss');
```

La comparación debe respetar los límites inclusivos de las 07:45:00 y 07:40:00.

## 16. Comandos útiles

Iniciar backend:

```powershell
npm run start:dev
```

Generar cliente Prisma:

```powershell
npx prisma generate
```

Crear migración:

```powershell
npx prisma migrate dev --name nombre_migracion
```

Ver base de datos:

```powershell
npx prisma studio
```

Comprobar esquema:

```powershell
npx prisma validate
```

## 17. Checklist de implementación

- [ ] Crear proyecto NestJS.
- [ ] Instalar dependencias.
- [ ] Configurar variables de entorno.
- [ ] Configurar conexión PostgreSQL.
- [ ] Inicializar Prisma 6.
- [ ] Crear modelos Persona y Asistencia.
- [ ] Ejecutar migración inicial.
- [ ] Implementar PrismaService.
- [ ] Configurar Swagger.
- [ ] Crear módulo de personas.
- [ ] Crear módulo de asistencias.
- [ ] Implementar registro por escáner.
- [ ] Implementar control de duplicados.
- [ ] Implementar clasificación de puntualidad.
- [ ] Implementar cierre diario y ausencias.
- [ ] Implementar filtros e historial.
- [ ] Implementar exportación Excel.
- [ ] Conectar Angular 19.

## 18. Consideraciones de seguridad

- No almacenar contraseñas en el código fuente.
- No publicar `.env` en Git.
- Restringir el acceso al puerto PostgreSQL 5432 a los equipos autorizados.
- Validar todos los DTO.
- No confiar en la hora enviada por el navegador.
- Registrar errores y eventos importantes.
- Implementar autenticación y autorización antes de exponer el sistema en producción.
- Utilizar HTTPS en producción.
- No eliminar el volumen Docker de PostgreSQL para realizar migraciones.

---

**Resultado esperado:** un backend NestJS conectado a PostgreSQL 17 mediante Prisma 6, preparado para implementar la gestión de personas, asistencia automática por escáner, control de puntualidad, seguimiento y reportes Excel.