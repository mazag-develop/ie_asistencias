import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async getEventos() {
    const [personas, asistencias] = await Promise.all([
      this.prisma.auditoriaPersona.findMany({
        orderBy: { fechaHora: 'desc' },
        take: 100,
        include: {
          persona: {
            select: { id: true, codigo: true, nombres: true, apellidos: true },
          },
        },
      }),
      this.prisma.auditoriaAsistencia.findMany({
        orderBy: { fechaHora: 'desc' },
        take: 100,
        include: {
          asistencia: {
            select: { id: true, fechaEscolar: true, estado: true },
          },
          persona: {
            select: { id: true, codigo: true, nombres: true, apellidos: true },
          },
        },
      }),
    ]);

    const data = [
      ...personas.map((evento) => ({ entidad: 'PERSONA', ...evento })),
      ...asistencias.map((evento) => ({ entidad: 'ASISTENCIA', ...evento })),
    ]
      .sort((a, b) => b.fechaHora.getTime() - a.fechaHora.getTime())
      .slice(0, 100);

    return { success: true, data };
  }
}
