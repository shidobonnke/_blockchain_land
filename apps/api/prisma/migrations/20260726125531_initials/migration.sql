-- Enable spatial types before creating tables that use geometry columns.
CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CITIZEN', 'SURVEYOR', 'COMMUNITY_REPRESENTATIVE', 'LAND_ADMINISTRATOR', 'LEGAL_OFFICER', 'REGISTRAR', 'GOVERNOR', 'JUDICIARY', 'AUDITOR', 'SYSTEM_ADMIN');

-- CreateEnum
CREATE TYPE "TenureType" AS ENUM ('STATUTORY', 'CUSTOMARY');

-- CreateEnum
CREATE TYPE "ParcelStatus" AS ENUM ('UNREGISTERED', 'PENDING', 'SPATIALLY_VERIFIED', 'COMMUNITY_VALIDATED', 'APPROVED', 'ACTIVE', 'REJECTED', 'DISPUTED', 'SUSPENDED', 'TRANSFERRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'SPATIAL_REVIEW', 'COMMUNITY_REVIEW', 'LEGAL_REVIEW', 'REGISTRAR_REVIEW', 'BLOCKCHAIN_PENDING', 'MINTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('APPROVE', 'REJECT', 'ABSTAIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CITIZEN',
    "walletAddress" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandParcel" (
    "id" TEXT NOT NULL,
    "parcelCode" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "lga" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "tenureType" "TenureType" NOT NULL,
    "status" "ParcelStatus" NOT NULL DEFAULT 'UNREGISTERED',
    "geometry" geometry(Polygon, 4326) NOT NULL,
    "geometryHash" TEXT,
    "areaSqM" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandParcel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandApplication" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "claimDescription" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTransition" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromStatus" "ApplicationStatus" NOT NULL,
    "toStatus" "ApplicationStatus" NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attestation" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "representativeId" TEXT NOT NULL,
    "decision" "Decision" NOT NULL,
    "evidenceHash" TEXT,
    "signature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attestation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandTitle" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "ownerWallet" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "blockNumber" BIGINT,
    "metadataHash" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferRequest" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "newOwnerId" TEXT NOT NULL,
    "newOwnerWallet" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "legalApprovedAt" TIMESTAMP(3),
    "registrarApprovedAt" TIMESTAMP(3),
    "transactionHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevocationRequest" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "publicInterestReason" TEXT NOT NULL,
    "reasonHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_VALIDATOR_VOTE',
    "validatorApprovals" INTEGER NOT NULL DEFAULT 0,
    "validatorCount" INTEGER NOT NULL DEFAULT 0,
    "judiciaryApprovedAt" TIMESTAMP(3),
    "transactionHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevocationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevocationVote" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "validatorId" TEXT NOT NULL,
    "approve" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevocationVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockchainTransaction" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "transactionHash" TEXT,
    "blockNumber" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "submittedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockchainTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationMetric" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "context" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncOperation" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LandParcel_parcelCode_key" ON "LandParcel"("parcelCode");

-- CreateIndex
CREATE INDEX "LandParcel_status_idx" ON "LandParcel"("status");

-- CreateIndex
CREATE INDEX "LandApplication_status_idx" ON "LandApplication"("status");

-- CreateIndex
CREATE INDEX "LandApplication_applicantId_idx" ON "LandApplication"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "Attestation_applicationId_representativeId_key" ON "Attestation"("applicationId", "representativeId");

-- CreateIndex
CREATE UNIQUE INDEX "LandTitle_parcelId_key" ON "LandTitle"("parcelId");

-- CreateIndex
CREATE UNIQUE INDEX "LandTitle_tokenId_key" ON "LandTitle"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "LandTitle_transactionHash_key" ON "LandTitle"("transactionHash");

-- CreateIndex
CREATE INDEX "TransferRequest_parcelId_status_idx" ON "TransferRequest"("parcelId", "status");

-- CreateIndex
CREATE INDEX "RevocationRequest_parcelId_status_idx" ON "RevocationRequest"("parcelId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RevocationVote_requestId_validatorId_key" ON "RevocationVote"("requestId", "validatorId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockchainTransaction_transactionHash_key" ON "BlockchainTransaction"("transactionHash");

-- CreateIndex
CREATE INDEX "BlockchainTransaction_entityType_entityId_idx" ON "BlockchainTransaction"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "BlockchainTransaction_status_idx" ON "BlockchainTransaction"("status");

-- CreateIndex
CREATE INDEX "EvaluationMetric_metric_recordedAt_idx" ON "EvaluationMetric"("metric", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");

-- CreateIndex
CREATE INDEX "SyncOperation_deviceId_createdAt_idx" ON "SyncOperation"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "LandApplication" ADD CONSTRAINT "LandApplication_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "LandParcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandApplication" ADD CONSTRAINT "LandApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTransition" ADD CONSTRAINT "WorkflowTransition_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LandApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LandApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandTitle" ADD CONSTRAINT "LandTitle_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "LandParcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "LandParcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "LandParcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevocationRequest" ADD CONSTRAINT "RevocationRequest_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "LandParcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevocationVote" ADD CONSTRAINT "RevocationVote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RevocationRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevocationVote" ADD CONSTRAINT "RevocationVote_validatorId_fkey" FOREIGN KEY ("validatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LandApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
