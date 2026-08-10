import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { ApplicationStatus, ParcelStatus, Role } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { canTransition, tenureAllowsReviewRoute } from "./workflow";
import { BlockchainService } from "../blockchain/blockchain.service";
import { EventPublisher } from "../events/event.publisher";
import { createHash } from "crypto";

const parcelStatusFor: Partial<Record<ApplicationStatus, ParcelStatus>> = {
  SUBMITTED: "PENDING",
  SPATIAL_REVIEW: "PENDING",
  COMMUNITY_REVIEW: "SPATIALLY_VERIFIED",
  LEGAL_REVIEW: "COMMUNITY_VALIDATED",
  REGISTRAR_REVIEW: "APPROVED",
  MINTED: "ACTIVE",
  REJECTED: "REJECTED"
};

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
    private events: EventPublisher
  ) {}

  list() {
    return this.prisma.landApplication.findMany({
      include: {
        parcel: { select: { parcelCode: true, status: true } },
        applicant: { select: { fullName: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(input: { parcelId: string; applicantId: string; claimDescription: string }) {
    const parcel = await this.prisma.landParcel.findUnique({ where: { id: input.parcelId } });
    if (!parcel) throw new NotFoundException("Parcel not found");
    return this.prisma.landApplication.create({ data: input });
  }

  async transition(id: string, input: { to: ApplicationStatus; reason: string; actorId: string }) {
    const [application, actor] = await Promise.all([
      this.prisma.landApplication.findUnique({
        where: { id },
        include: { parcel: true, applicant: true, documents: true, attestations: true }
      }),
      this.prisma.user.findUnique({ where: { id: input.actorId } })
    ]);
    if (!application || !actor) throw new NotFoundException("Application or actor not found");
    if (!canTransition(application.status, input.to, actor.role))
      throw new ForbiddenException(
        `Role ${actor.role} cannot move ${application.status} to ${input.to}`
      );
    if (
      application.status === "DRAFT" &&
      input.to === "SUBMITTED" &&
      actor.role === Role.CITIZEN &&
      application.applicantId !== actor.id
    )
      throw new ForbiddenException("Citizens can submit only their own applications");
    if (application.status === "SPATIAL_REVIEW") {
      if (!tenureAllowsReviewRoute(application.parcel.tenureType, input.to))
        throw new BadRequestException(
          application.parcel.tenureType === "CUSTOMARY"
            ? "Customary claims require community review"
            : "Statutory claims proceed directly to legal review"
        );
    }
    if (input.to === "COMMUNITY_REVIEW") await this.assertSpatiallyValid(application.parcelId);
    if (application.status === "COMMUNITY_REVIEW" && input.to === "LEGAL_REVIEW")
      await this.assertCommunityThreshold(application.id);
    let issued: { transactionHash: string; blockNumber?: number } | undefined;
    if (input.to === "MINTED") {
      if (!application.applicant.walletAddress)
        throw new BadRequestException("Applicant wallet is required before title issuance");
      if (!application.parcel.geometryHash)
        throw new BadRequestException("Parcel geometry hash is missing");
      const metadataHash = createHash("sha256")
        .update(
          JSON.stringify({
            applicationId: application.id,
            parcelCode: application.parcel.parcelCode,
            documents: application.documents.map((document) => document.contentHash),
            attestations: application.attestations.map(
              (attestation) => `${attestation.representativeId}:${attestation.decision}`
            )
          })
        )
        .digest("hex");
      issued = await this.blockchain.issueTitle({
        applicationId: application.id,
        parcelId: application.parcelId,
        parcelCode: application.parcel.parcelCode,
        geometryHash: application.parcel.geometryHash,
        metadataHash,
        ownerWallet: application.applicant.walletAddress
      });
      await this.prisma.landTitle.create({
        data: {
          parcelId: application.parcelId,
          tokenId: `${issued.blockNumber ?? 0}:${application.parcel.parcelCode}`,
          ownerWallet: application.applicant.walletAddress,
          contractAddress: process.env.TITLE_NFT_ADDRESS ?? "",
          transactionHash: issued.transactionHash,
          blockNumber: issued.blockNumber,
          metadataHash
        }
      });
    }

    const parcelStatus =
      input.to === "LEGAL_REVIEW" && application.parcel.tenureType === "STATUTORY"
        ? ParcelStatus.SPATIALLY_VERIFIED
        : parcelStatusFor[input.to];
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.landApplication
        .update({
          where: { id, version: application.version },
          data: {
            status: input.to,
            version: { increment: 1 },
            submittedAt: input.to === "SUBMITTED" ? new Date() : undefined
          }
        })
        .catch(() => {
          throw new BadRequestException("Application was updated by another user");
        });
      await tx.workflowTransition.create({
        data: {
          applicationId: id,
          fromStatus: application.status,
          toStatus: input.to,
          actorId: actor.id,
          reason: input.reason
        }
      });
      if (parcelStatus)
        await tx.landParcel.update({
          where: { id: application.parcelId },
          data: { status: parcelStatus }
        });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "WORKFLOW_TRANSITION",
          entityType: "LandApplication",
          entityId: id,
          before: { status: application.status },
          after: { status: input.to, reason: input.reason }
        }
      });
      if (input.to === "MINTED")
        this.events.publish(application.applicantId, "TITLE_ISSUED", {
          parcelId: application.parcelId,
          transactionHash: issued?.transactionHash
        });
      return updated;
    });
  }

  private async assertSpatiallyValid(parcelId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ valid: boolean; overlaps: bigint }>>`
      SELECT ST_IsValid(p.geometry) valid,
        (SELECT COUNT(*) FROM "LandParcel" o WHERE o.id <> p.id
          AND ST_Intersects(o.geometry, p.geometry)
          AND NOT ST_Touches(o.geometry, p.geometry)) overlaps
      FROM "LandParcel" p WHERE p.id = ${parcelId}::uuid`;
    if (!rows[0]?.valid || rows[0].overlaps > BigInt(0))
      throw new BadRequestException("Spatial validation failed");
  }

  private async assertCommunityThreshold(applicationId: string) {
    const votes = await this.prisma.attestation.groupBy({
      by: ["decision"],
      where: { applicationId },
      _count: true
    });
    const approvals = votes.find((v) => v.decision === "APPROVE")?._count ?? 0;
    if (approvals < 2)
      throw new BadRequestException("At least two community approvals are required");
  }

  async attest(
    id: string,
    input: {
      representativeId: string;
      decision: "APPROVE" | "REJECT" | "ABSTAIN";
      evidenceHash?: string;
      signature?: string;
    }
  ) {
    const [representative, application] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: input.representativeId } }),
      this.prisma.landApplication.findUnique({
        where: { id },
        include: { parcel: { select: { tenureType: true } } }
      })
    ]);
    if (!representative || representative.role !== Role.COMMUNITY_REPRESENTATIVE)
      throw new ForbiddenException("Only community representatives can attest");
    if (!application) throw new NotFoundException("Application not found");
    if (application.status !== "COMMUNITY_REVIEW" || application.parcel.tenureType !== "CUSTOMARY")
      throw new BadRequestException("Attestations are accepted only during customary review");
    return this.prisma.attestation.upsert({
      where: {
        applicationId_representativeId: {
          applicationId: id,
          representativeId: input.representativeId
        }
      },
      create: { applicationId: id, ...input },
      update: {
        decision: input.decision,
        evidenceHash: input.evidenceHash,
        signature: input.signature
      }
    });
  }
}
