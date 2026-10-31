CREATE TYPE "TipoPersona" AS ENUM ('ESTUDIANTE', 'PROFESOR');

CREATE TYPE "EstadoAsistencia" AS ENUM ('PUNTUAL', 'TARDANZA', 'FALTA');

CREATE TABLE "personas" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "documento" VARCHAR(20),
    "nombres" VARCHAR(100) NOT NULL,
    "apellidos" VARCHAR(100) NOT NULL,
    "tipo" "TipoPersona" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "asistencias" (
    "id" SERIAL NOT NULL,
    "personaId" INTEGER NOT NULL,
    "fechaEscolar" VARCHAR(10) NOT NULL,
    "fechaHora" TIMESTAMPTZ(3) NOT NULL,
    "estado" "EstadoAsistencia" NOT NULL,
    "codigoLeido" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asistencias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "personas_codigo_key" ON "personas"("codigo");
CREATE UNIQUE INDEX "personas_documento_key" ON "personas"("documento");
CREATE INDEX "personas_tipo_activo_idx" ON "personas"("tipo", "activo");
CREATE INDEX "asistencias_fechaEscolar_estado_idx" ON "asistencias"("fechaEscolar", "estado");
CREATE INDEX "asistencias_personaId_fechaEscolar_idx" ON "asistencias"("personaId", "fechaEscolar");
CREATE UNIQUE INDEX "asistencias_personaId_fechaEscolar_key" ON "asistencias"("personaId", "fechaEscolar");

ALTER TABLE "asistencias"
ADD CONSTRAINT "asistencias_personaId_fkey"
FOREIGN KEY ("personaId") REFERENCES "personas"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
