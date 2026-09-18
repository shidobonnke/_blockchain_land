import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateParcelInput } from "@anagu/shared";
import { createHash } from "crypto";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class ParcelsService {
  constructor(private prisma: PrismaService) {}

  async create(input: CreateParcelInput) {
    const geometryJson = JSON.stringify(input.geometry);
    const overlaps = await this.prisma.$queryRaw<Array<{ id: string; parcelCode: string }>>`
      SELECT id, "parcelCode" FROM "LandParcel"
      WHERE ST_Intersects(
        geometry,
        ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}), 4326)
      )
      AND NOT ST_Touches(
        geometry,
        ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}), 4326)
      )
      LIMIT 10`;
    if (overlaps.length) {
      await this.prisma.evaluationMetric.create({
        data: {
          category: "FRAUD_REDUCTION",
          metric: "MULTIPLE_ALLOCATION_PREVENTED",
          value: 1,
          unit: "attempt",
          context: { parcelCode: input.parcelCode, overlaps }
        }
      });
      throw new ConflictException({ message: "Parcel overlaps existing land", overlaps });
    }
    const geometryHash = createHash("sha256").update(geometryJson).digest("hex");
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "LandParcel"
        (
          id,
          "parcelCode",
          state,
          lga,
          address,
          "tenureType",
          status,
          geometry,
          "geometryHash",
          "areaSqM",
          "createdAt",
          "updatedAt"
        )
      VALUES
        (gen_random_uuid(), ${input.parcelCode}, ${input.state}, ${input.lga}, ${input.address},
         ${input.tenureType}::"TenureType", 'PENDING'::"ParcelStatus",
         ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}), 4326), ${geometryHash},
         ST_Area(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}), 4326), 3857)),
         NOW(), NOW())
      RETURNING id`;
    return this.findOne(rows[0].id);
  }

  async list() {
    return this.prisma.$queryRaw`
      SELECT id, "parcelCode", state, lga, address, "tenureType", status,
        "areaSqM", "geometryHash", ST_AsGeoJSON(geometry)::json AS geometry,
        "createdAt", "updatedAt"
      FROM "LandParcel" ORDER BY "createdAt" DESC`;
  }

  async findOne(id: string) {
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, "parcelCode", state, lga, address, "tenureType", status,
        "areaSqM", "geometryHash", ST_AsGeoJSON(geometry)::json AS geometry,
        "createdAt", "updatedAt"
      FROM "LandParcel" WHERE id = ${id}`;
    if (!rows.length) throw new NotFoundException("Parcel not found");
    return rows[0];
  }

  async validateGeometry(id: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{ valid: boolean; reason: string; overlaps: bigint }>
    >`
      SELECT ST_IsValid(p.geometry) AS valid, ST_IsValidReason(p.geometry) AS reason,
        (SELECT COUNT(*) FROM "LandParcel" o
         WHERE o.id <> p.id AND ST_Intersects(o.geometry, p.geometry)
           AND NOT ST_Touches(o.geometry, p.geometry)) AS overlaps
      FROM "LandParcel" p WHERE p.id = ${id}`;
    if (!rows.length) throw new NotFoundException("Parcel not found");
    return {
      ...rows[0],
      overlaps: Number(rows[0].overlaps),
      accepted: rows[0].valid && rows[0].overlaps === BigInt(0)
    };
  }
}
