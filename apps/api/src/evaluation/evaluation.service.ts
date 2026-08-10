import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class EvaluationService {
  constructor(private prisma: PrismaService) {}
  async dashboard() {
    const [
      totalParcels,
      activeParcels,
      overlapsRejected,
      auditEntries,
      confirmedTransactions,
      failedTransactions,
      syncTotal,
      syncProcessed,
      latency,
      spatialIntegrity
    ] = await Promise.all([
      this.prisma.landParcel.count(),
      this.prisma.landParcel.count({ where: { status: { in: ["ACTIVE", "TRANSFERRED"] } } }),
      this.prisma.evaluationMetric.count({ where: { metric: "MULTIPLE_ALLOCATION_PREVENTED" } }),
      this.prisma.auditLog.count(),
      this.prisma.blockchainTransaction.count({ where: { status: "CONFIRMED" } }),
      this.prisma.blockchainTransaction.count({ where: { status: "FAILED" } }),
      this.prisma.syncOperation.count(),
      this.prisma.syncOperation.count({ where: { processedAt: { not: null } } }),
      this.prisma.evaluationMetric.aggregate({
        where: { metric: "VALIDATION_LATENCY" },
        _avg: { value: true }
      }),
      this.prisma.$queryRaw<Array<{ verified: bigint }>>`
        SELECT COUNT(*) AS verified
        FROM "LandParcel" p
        WHERE p."geometryHash" IS NOT NULL
          AND ST_IsValid(p.geometry)
          AND NOT EXISTS (
            SELECT 1 FROM "LandParcel" o
            WHERE o.id <> p.id AND ST_Intersects(o.geometry, p.geometry)
              AND NOT ST_Touches(o.geometry, p.geometry)
          )`
    ]);
    const transactions = confirmedTransactions + failedTransactions;
    return {
      dataSecurity: {
        integrityVerificationRate: totalParcels
          ? Number(spatialIntegrity[0]?.verified ?? 0) / totalParcels
          : 1,
        activeParcelRate: totalParcels ? activeParcels / totalParcels : 0,
        confirmedBlockchainTransactions: confirmedTransactions,
        failedBlockchainTransactions: failedTransactions
      },
      fraudReduction: {
        multipleAllocationPreventions: overlapsRejected,
        auditTrailEntries: auditEntries
      },
      transparency: {
        blockchainConfirmationRate: transactions ? confirmedTransactions / transactions : 1
      },
      performance: {
        averageValidationLatencyMs: latency._avg.value ?? 0,
        offlineSynchronizationReliability: syncTotal ? syncProcessed / syncTotal : 1
      },
      sampleSizes: {
        parcels: totalParcels,
        blockchainTransactions: transactions,
        syncOperations: syncTotal
      }
    };
  }
  history(metric?: string) {
    return this.prisma.evaluationMetric.findMany({
      where: metric ? { metric } : undefined,
      orderBy: { recordedAt: "desc" },
      take: 1000
    });
  }
}
