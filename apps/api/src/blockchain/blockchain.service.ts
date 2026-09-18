import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Contract, JsonRpcProvider, Wallet, id } from "ethers";
import { PrismaService } from "../common/prisma.service";

const ABI = [
  "function issueTitle(bytes32 parcelId,bytes32 geometryHash,bytes32 metadataHash,address owner) returns (uint256)",
  "function transferTitle(bytes32 parcelId,address newOwner)",
  "function setDisputed(bytes32 parcelId,bool disputed,bytes32 evidenceHash)",
  "function requestRevocation(bytes32 parcelId,bytes32 reasonHash)",
  "function voteRevocation(bytes32 parcelId)",
  "function approveRevocation(bytes32 parcelId)",
  "function executeRevocation(bytes32 parcelId)"
];

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
    return this.submit("LandApplication", input.applicationId, "ISSUE_TITLE", async (contract) =>
      contract.issueTitle(
        id(input.parcelCode),
        `0x${input.geometryHash}`,
        `0x${input.metadataHash}`,
        input.ownerWallet
      )
    );
  }
  async transfer(entityId: string, parcelCode: string, newOwner: string) {
    return this.submit("TransferRequest", entityId, "TRANSFER_TITLE", (c) =>
      c.transferTitle(id(parcelCode), newOwner)
    );
  }
  async setDisputed(entityId: string, parcelCode: string, disputed: boolean, evidenceHash: string) {
    return this.submit("Dispute", entityId, disputed ? "LOCK_DISPUTE" : "RESOLVE_DISPUTE", (c) =>
      c.setDisputed(id(parcelCode), disputed, id(evidenceHash))
    );
  }
  async requestRevocation(entityId: string, parcelCode: string, reason: string) {
    return this.submit("RevocationRequest", entityId, "REQUEST_REVOCATION", (c) =>
      c.requestRevocation(id(parcelCode), id(reason))
    );
  }
  async approveRevocation(entityId: string, parcelCode: string) {
    return this.submit("RevocationRequest", entityId, "APPROVE_REVOCATION", (c) =>
      c.approveRevocation(id(parcelCode))
    );
  }
  async voteRevocation(entityId: string, parcelCode: string) {
    return this.submit("RevocationRequest", entityId, "VOTE_REVOCATION", (c) =>
      c.voteRevocation(id(parcelCode))
    );
  }
  async executeRevocation(entityId: string, parcelCode: string) {
    return this.submit("RevocationRequest", entityId, "EXECUTE_REVOCATION", (c) =>
      c.executeRevocation(id(parcelCode))
    );
  }

  private contract() {
    const rpc = this.config.get<string>("RPC_URL");
    const key = this.config.get<string>("BLOCKCHAIN_SIGNER_PRIVATE_KEY");
    const address = this.config.get<string>("LAND_REGISTRY_ADDRESS");
    if (!rpc || !key || !address)
      throw new ServiceUnavailableException("Blockchain signer or contract is not configured");
    return new Contract(address, ABI, new Wallet(key, new JsonRpcProvider(rpc)));
  }

  private async submit(
    entityType: string,
    entityId: string,
    operation: string,
    send: (contract: Contract) => Promise<{
      hash: string;
      wait(): Promise<{ blockNumber: number; gasUsed?: bigint } | null>;
    }>
  ) {
    const record = await this.prisma.blockchainTransaction.create({
      data: { entityType, entityId, operation }
    });
    const started = performance.now();
    try {
      const tx = await send(this.contract());
      await this.prisma.blockchainTransaction.update({
        where: { id: record.id },
        data: { status: "SUBMITTED", transactionHash: tx.hash, submittedAt: new Date() }
      });
      const receipt = await tx.wait();
      const latency = performance.now() - started;
      const metrics = [
        this.prisma.blockchainTransaction.update({
          where: { id: record.id },
          data: { status: "CONFIRMED", blockNumber: receipt?.blockNumber, confirmedAt: new Date() }
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
      if (receipt?.gasUsed !== undefined)
        metrics.push(
          this.prisma.evaluationMetric.create({
            data: {
              category: "PERFORMANCE",
              metric: "TRANSACTION_GAS_USED",
              value: Number(receipt.gasUsed),
              unit: "gas",
              context: { operation }
            }
          })
        );
      await this.prisma.$transaction(metrics);
      return { transactionHash: tx.hash, blockNumber: receipt?.blockNumber };
    } catch (error) {
      await this.prisma.blockchainTransaction.update({
        where: { id: record.id },
        data: { status: "FAILED", error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }
}
