import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "crypto";
import { BlockchainService } from "../blockchain/blockchain.service";
import { PrismaService } from "../common/prisma.service";
import { EventPublisher } from "../events/event.publisher";

@Injectable()
export class GovernanceService {
  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
    private events: EventPublisher
  ) {}

  async requestTransfer(input: {
    parcelId: string;
    requestedById: string;
    newOwnerId: string;
    newOwnerWallet: string;
  }) {
    const [parcel, requester, newOwner, pendingTransfer] = await Promise.all([
      this.prisma.landParcel.findUnique({
        where: { id: input.parcelId },
        include: { title: true }
      }),
      this.prisma.user.findUnique({ where: { id: input.requestedById } }),
      this.prisma.user.findUnique({ where: { id: input.newOwnerId } }),
      this.prisma.transferRequest.count({
        where: { parcelId: input.parcelId, status: { in: ["PENDING", "LEGAL_APPROVED"] } }
      })
    ]);
    if (!parcel?.title || !["ACTIVE", "TRANSFERRED"].includes(parcel.status))
      throw new BadRequestException("Parcel has no transferable active title");
    if (
      !requester?.walletAddress ||
      requester.walletAddress.toLowerCase() !== parcel.title.ownerWallet.toLowerCase()
    )
      throw new BadRequestException("Only the registered title owner can request a transfer");
    if (!newOwner || newOwner.walletAddress?.toLowerCase() !== input.newOwnerWallet.toLowerCase())
      throw new BadRequestException("New-owner identity and wallet do not match");
    if (pendingTransfer) throw new BadRequestException("A transfer request is already pending");
    const openDispute = await this.prisma.dispute.count({
      where: { parcelId: input.parcelId, status: "OPEN" }
    });
    if (openDispute) throw new BadRequestException("Title is locked by an open dispute");
    return this.prisma.transferRequest.create({ data: input });
  }

  async approveTransfer(id: string, stage: "LEGAL" | "REGISTRAR") {
    const request = await this.prisma.transferRequest.findUnique({
      where: { id },
      include: { parcel: true }
    });
    if (!request) throw new NotFoundException("Transfer request not found");
    if (request.status === "COMPLETED")
      throw new BadRequestException("Transfer request is already complete");
    if (stage === "LEGAL")
      return this.prisma.transferRequest.update({
        where: { id },
        data: { legalApprovedAt: new Date(), status: "LEGAL_APPROVED" }
      });
    if (!request.legalApprovedAt) throw new BadRequestException("Legal approval is required first");
    const chain = await this.blockchain.transfer(
      id,
      request.parcel.parcelCode,
      request.newOwnerWallet
    );
    const updated = await this.prisma.$transaction(async (tx) => {
      const transfer = await tx.transferRequest.update({
        where: { id },
        data: {
          registrarApprovedAt: new Date(),
          status: "COMPLETED",
          transactionHash: chain.transactionHash
        }
      });
      await tx.landParcel.update({
        where: { id: request.parcelId },
        data: { status: "TRANSFERRED" }
      });
      await tx.landTitle.update({
        where: { parcelId: request.parcelId },
        data: { ownerWallet: request.newOwnerWallet, transactionHash: chain.transactionHash }
      });
      return transfer;
    });
    this.events.publish(request.newOwnerId, "TITLE_TRANSFERRED", {
      parcelId: request.parcelId,
      transactionHash: chain.transactionHash
    });
    return updated;
  }

  async openDispute(input: { parcelId: string; raisedById: string; summary: string }) {
    const parcel = await this.prisma.landParcel.findUnique({ where: { id: input.parcelId } });
    if (!parcel || !["ACTIVE", "TRANSFERRED"].includes(parcel.status))
      throw new BadRequestException("Only an active title can be disputed");
    const existing = await this.prisma.dispute.count({
      where: { parcelId: input.parcelId, status: "OPEN" }
    });
    if (existing) throw new BadRequestException("An open dispute already exists");
    const dispute = await this.prisma.dispute.create({ data: input, include: { parcel: true } });
    await this.blockchain.setDisputed(dispute.id, dispute.parcel.parcelCode, true, input.summary);
    await this.prisma.landParcel.update({
      where: { id: input.parcelId },
      data: { status: "DISPUTED" }
    });
    return dispute;
  }

  async resolveDispute(id: string, resolution: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: { parcel: true }
    });
    if (!dispute) throw new NotFoundException("Dispute not found");
    if (dispute.status !== "OPEN") throw new BadRequestException("Dispute is already resolved");
    await this.blockchain.setDisputed(id, dispute.parcel.parcelCode, false, resolution);
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.dispute.update({
        where: { id },
        data: { status: "RESOLVED", resolution, resolvedAt: new Date() }
      });
      await tx.landParcel.update({ where: { id: dispute.parcelId }, data: { status: "ACTIVE" } });
      return result;
    });
  }

  async requestRevocation(input: {
    parcelId: string;
    requestedById: string;
    publicInterestReason: string;
    validatorCount: number;
  }) {
    if (input.publicInterestReason.trim().length < 20)
      throw new BadRequestException("A detailed public-interest reason is required");
    const request = await this.prisma.revocationRequest.create({
      data: {
        ...input,
        reasonHash: createHash("sha256").update(input.publicInterestReason).digest("hex")
      },
      include: { parcel: true }
    });
    const chain = await this.blockchain.requestRevocation(
      request.id,
      request.parcel.parcelCode,
      request.publicInterestReason
    );
    return this.prisma.revocationRequest.update({
      where: { id: request.id },
      data: { status: "PENDING_VALIDATOR_VOTE", transactionHash: chain.transactionHash }
    });
  }

  async recordValidatorVote(id: string, validatorId: string, approve: boolean) {
    const request = await this.prisma.revocationRequest.findUnique({
      where: { id },
      include: { parcel: true }
    });
    if (!request) throw new NotFoundException("Revocation request not found");
    await this.prisma.revocationVote
      .create({ data: { requestId: id, validatorId, approve } })
      .catch(() => {
        throw new BadRequestException("Validator has already voted");
      });
    if (approve) await this.blockchain.voteRevocation(id, request.parcel.parcelCode);
    const approvals = await this.prisma.revocationVote.count({
      where: { requestId: id, approve: true }
    });
    const thresholdReached =
      request.validatorCount > 0 && approvals / request.validatorCount > 0.75;
    const updated = await this.prisma.revocationRequest.update({
      where: { id },
      data: {
        validatorApprovals: approvals,
        status: thresholdReached ? "PENDING_JUDICIARY" : request.status
      }
    });
    return updated;
  }

  async judiciaryApprove(id: string) {
    const request = await this.prisma.revocationRequest.findUnique({
      where: { id },
      include: { parcel: true }
    });
    if (!request || request.status !== "PENDING_JUDICIARY")
      throw new BadRequestException("Super-majority approval is incomplete");
    const chain = await this.blockchain.approveRevocation(id, request.parcel.parcelCode);
    return this.prisma.revocationRequest.update({
      where: { id },
      data: {
        judiciaryApprovedAt: new Date(),
        status: "JUDICIARY_APPROVED",
        transactionHash: chain.transactionHash
      }
    });
  }

  async executeRevocation(id: string) {
    const request = await this.prisma.revocationRequest.findUnique({
      where: { id },
      include: { parcel: true }
    });
    if (!request?.judiciaryApprovedAt)
      throw new BadRequestException("Judiciary approval is required");
    const chain = await this.blockchain.executeRevocation(id, request.parcel.parcelCode);
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.revocationRequest.update({
        where: { id },
        data: { status: "EXECUTED", transactionHash: chain.transactionHash }
      });
      await tx.landParcel.update({ where: { id: request.parcelId }, data: { status: "REVOKED" } });
      return result;
    });
  }
}
