ALTER TABLE "personas"
ADD COLUMN "grado" VARCHAR(50),
ADD COLUMN "seccion" VARCHAR(20),
ADD COLUMN "cargo" VARCHAR(30);

CREATE TABLE "auditoria_personas" (
    "id" SERIAL NOT NULL,
    "personaId" INTEGER,
    "accion" VARCHAR(30) NOT NULL,
    "datosAnteriores" JSONB,
    "datosNuevos" JSONB,
    "actorId" INTEGER,
    "fechaHora" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_personas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auditoria_asistencias" (
    "id" SERIAL NOT NULL,
    "asistenciaId" INTEGER,
    "personaId" INTEGER,
    "accion" VARCHAR(30) NOT NULL,
    "datosAnteriores" JSONB,
    "datosNuevos" JSONB,
    "actorId" INTEGER,
    "fechaHora" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_asistencias_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "auditoria_personas_personaId_fechaHora_idx"
ON "auditoria_personas"("personaId", "fechaHora");
CREATE INDEX "auditoria_personas_fechaHora_idx"
ON "auditoria_personas"("fechaHora");
CREATE INDEX "auditoria_asistencias_asistenciaId_fechaHora_idx"
ON "auditoria_asistencias"("asistenciaId", "fechaHora");
CREATE INDEX "auditoria_asistencias_personaId_fechaHora_idx"
ON "auditoria_asistencias"("personaId", "fechaHora");
CREATE INDEX "auditoria_asistencias_fechaHora_idx"
ON "auditoria_asistencias"("fechaHora");

ALTER TABLE "auditoria_personas"
ADD CONSTRAINT "auditoria_personas_personaId_fkey"
FOREIGN KEY ("personaId") REFERENCES "personas"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "auditoria_asistencias"
ADD CONSTRAINT "auditoria_asistencias_asistenciaId_fkey"
FOREIGN KEY ("asistenciaId") REFERENCES "asistencias"("id")
ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "auditoria_asistencias_personaId_fkey"
FOREIGN KEY ("personaId") REFERENCES "personas"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
