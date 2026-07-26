import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}
  async accept(input: {
    id: string;
    deviceId: string;
    userId: string;
    operation: string;
    payload: Record<string, unknown>;
  }) {
    const existing = await this.prisma.syncOperation.findUnique({ where: { id: input.id } });
    if (existing) return { duplicate: true, id: existing.id, result: existing.result };
    const result = { accepted: true, serverTime: new Date().toISOString() };
    await this.prisma.syncOperation.create({
      data: {
        ...input,
        payload: input.payload as Prisma.InputJsonObject,
        result,
        processedAt: new Date()
      }
    });
    return { duplicate: false, id: input.id, result };
  }
}
