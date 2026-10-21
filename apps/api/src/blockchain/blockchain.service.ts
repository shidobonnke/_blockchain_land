import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { id } from "ethers";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class BlockchainService {
  constructor(private config: ConfigService, private prisma: PrismaService) {}

  async issueTitle(input: {
    applicationId: string;
    parcelId: string;
    parcelCode: string;
    geometryHash: string;
    metadataHash: string;
    ownerWallet: string;
  }) {
    return this.submit("LandApplication", input.applicationId, "ISSUE_TITLE", "issueTitle", [id(input.parcelCode), `0x${input.geometryHash}`, `0x${input.metadataHash}`, input.ownerWallet]);
  }
  async transfer(entityId: string, parcelCode: string, newOwner: string) {
    return this.submit("TransferRequest", entityId, "TRANSFER_TITLE", "transferTitle", [id(parcelCode), newOwner]);
  }
  async setDisputed(entityId: string, parcelCode: string, disputed: boolean, evidenceHash: string) {
    return this.submit("Dispute", entityId, disputed ? "LOCK_DISPUTE" : "RESOLVE_DISPUTE", "setDisputed", [id(parcelCode), disputed, id(evidenceHash)]);
  }
  async requestRevocation(entityId: string, parcelCode: string, reason: string) {
    return this.submit("RevocationRequest", entityId, "REQUEST_REVOCATION", "requestRevocation", [id(parcelCode), id(reason)]);
  }
  async approveRevocation(entityId: string, parcelCode: string) {
    return this.submit("RevocationRequest", entityId, "APPROVE_REVOCATION", "approveRevocation", [id(parcelCode)]);
  }
  async voteRevocation(entityId: string, parcelCode: string) {
    return this.submit("RevocationRequest", entityId, "VOTE_REVOCATION", "voteRevocation", [id(parcelCode)]);
  }
  async executeRevocation(entityId: string, parcelCode: string) {
    return this.submit("RevocationRequest", entityId, "EXECUTE_REVOCATION", "executeRevocation", [id(parcelCode)]);
  }

  private async submit(
    entityType: string,
    entityId: string,
    operation: string,
    chainOperation: string,
    args: unknown[]
  ) {
    const record = await this.prisma.blockchainTransaction.create({
      data: { entityType, entityId, operation }
    });
    const started = performance.now();
    try {
      const gateway = this.config.get<string>("PURECHAIN_API_URL") ?? "http://localhost:8100";
      const response = await fetch(`${gateway}/v1/transactions/${chainOperation}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ args })
      });
      const result = await response.json() as { transactionHash?: string; blockNumber?: number; message?: string };
      if (!response.ok) throw new ServiceUnavailableException(result.message ?? "PureChain gateway failed");
      if (!result.transactionHash) throw new ServiceUnavailableException("PureChain gateway returned no transaction hash");
      await this.prisma.blockchainTransaction.update({
        where: { id: record.id },
        data: { status: "SUBMITTED", transactionHash: result.transactionHash, submittedAt: new Date() }
      });
      const latency = performance.now() - started;
      const metrics = [
        this.prisma.blockchainTransaction.update({
          where: { id: record.id },
          data: { status: "CONFIRMED", blockNumber: result.blockNumber, confirmedAt: new Date() }
        }),
        this.prisma.evaluationMetric.create({
          data: {
            category: "PERFORMANCE",
            metric: "VALIDATION_LATENCY",
            value: latency,
            unit: "ms",
            context: { operation }
          }
        })
      ];
      await this.prisma.$transaction(metrics);
      return { transactionHash: result.transactionHash, blockNumber: result.blockNumber };
    } catch (error) {
      await this.prisma.blockchainTransaction.update({
        where: { id: record.id },
        data: { status: "FAILED", error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }
}
