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
      latency
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
      })
    ]);
    const transactions = confirmedTransactions + failedTransactions;
    return {
      dataSecurity: {
        integrityVerificationRate: totalParcels ? activeParcels / totalParcels : 1,
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
