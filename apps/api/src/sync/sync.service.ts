import { BadRequestException, Injectable } from "@nestjs/common";
import { fieldApplicationSchema } from "@anagu/shared";
import { Prisma } from "@prisma/client";
import { createHash } from "crypto";
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
    if (input.operation !== "CREATE_FIELD_APPLICATION")
      throw new BadRequestException(`Unsupported offline operation: ${input.operation}`);

    const parsed = fieldApplicationSchema.safeParse(input.payload);
    if (!parsed.success)
      throw new BadRequestException({
        message: "Invalid field application",
        issues: parsed.error.issues
      });
    const field = parsed.data;
    const geometryJson = JSON.stringify(field.geometry);

    return this.prisma.$transaction(async (tx) => {
      // Recheck inside the transaction so retries and concurrent submissions remain idempotent.
      const duplicate = await tx.syncOperation.findUnique({ where: { id: input.id } });
      if (duplicate) return { duplicate: true, id: duplicate.id, result: duplicate.result };
      const checks = await tx.$queryRaw<Array<{ valid: boolean; overlaps: bigint }>>`
        SELECT ST_IsValid(candidate) AS valid,
          (SELECT COUNT(*) FROM "LandParcel"
           WHERE ST_Intersects(geometry, candidate)
             AND NOT ST_Touches(geometry, candidate)) AS overlaps
        FROM (SELECT ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}), 4326) candidate) incoming`;
      const accepted = Boolean(checks[0]?.valid) && checks[0].overlaps === BigInt(0);
      if (!accepted) {
        const result = {
          accepted: false,
          reason: checks[0]?.valid ? "PARCEL_OVERLAP" : "INVALID_GEOMETRY",
          serverTime: new Date().toISOString()
        };
        if (checks[0]?.valid)
          await tx.evaluationMetric.create({
            data: {
              category: "FRAUD_REDUCTION",
              metric: "MULTIPLE_ALLOCATION_PREVENTED",
              value: 1,
              unit: "attempt",
              context: { parcelCode: field.parcelCode, source: "OFFLINE_SYNC" }
            }
          });
        await tx.syncOperation.create({
          data: {
            ...input,
            payload: input.payload as Prisma.InputJsonObject,
            result,
            processedAt: new Date()
          }
        });
        return { duplicate: false, id: input.id, result };
      }

      const geometryHash = createHash("sha256").update(geometryJson).digest("hex");
      const parcels = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO "LandParcel"
          (id, "parcelCode", state, lga, address, "tenureType", status, geometry,
           "geometryHash", "areaSqM", "createdAt", "updatedAt")
        VALUES
          (gen_random_uuid(), ${field.parcelCode}, ${field.state}, ${field.lga}, ${field.address},
           ${field.tenureType}::"TenureType", 'PENDING'::"ParcelStatus",
           ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}), 4326), ${geometryHash},
           ST_Area(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}), 4326), 3857)),
           NOW(), NOW())
        RETURNING id`;
      const application = await tx.landApplication.create({
        data: {
          parcelId: parcels[0].id,
          applicantId: input.userId,
          claimDescription: field.claimDescription
        }
      });
      const result = {
        accepted: true,
        parcelId: parcels[0].id,
        applicationId: application.id,
        serverTime: new Date().toISOString()
      };
      await tx.syncOperation.create({
        data: {
          ...input,
          payload: input.payload as Prisma.InputJsonObject,
          result,
          processedAt: new Date()
        }
      });
      await tx.auditLog.create({
        data: {
          actorId: input.userId,
          action: "OFFLINE_FIELD_APPLICATION_CREATED",
          entityType: "LandApplication",
          entityId: application.id,
          after: { parcelId: parcels[0].id, deviceId: input.deviceId, capturedAt: field.capturedAt }
        }
      });
      return { duplicate: false, id: input.id, result };
    });
  }
}
