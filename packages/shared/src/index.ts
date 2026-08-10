import { z } from "zod";

export const roles = [
  "CITIZEN",
  "SURVEYOR",
  "COMMUNITY_REPRESENTATIVE",
  "LAND_ADMINISTRATOR",
  "LEGAL_OFFICER",
  "REGISTRAR",
  "GOVERNOR",
  "JUDICIARY",
  "AUDITOR",
  "SYSTEM_ADMIN"
] as const;
export type Role = (typeof roles)[number];

export const parcelStatuses = [
  "UNREGISTERED",
  "PENDING",
  "SPATIALLY_VERIFIED",
  "COMMUNITY_VALIDATED",
  "APPROVED",
  "ACTIVE",
  "REJECTED",
  "DISPUTED",
  "SUSPENDED",
  "TRANSFERRED",
  "REVOKED"
] as const;
export type ParcelStatus = (typeof parcelStatuses)[number];

export const applicationStatuses = [
  "DRAFT",
  "SUBMITTED",
  "SPATIAL_REVIEW",
  "COMMUNITY_REVIEW",
  "LEGAL_REVIEW",
  "REGISTRAR_REVIEW",
  "BLOCKCHAIN_PENDING",
  "MINTED",
  "REJECTED",
  "CANCELLED"
] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];

const positionSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

export const polygonSchema = z
  .object({
    type: z.literal("Polygon"),
    coordinates: z.array(z.array(positionSchema).min(4)).min(1)
  })
  .superRefine(({ coordinates }, context) => {
    for (const ring of coordinates) {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        context.addIssue({ code: "custom", message: "Polygon rings must be closed" });
      }
      const distinct = new Set(ring.slice(0, -1).map(([x, y]) => `${x}:${y}`));
      if (distinct.size < 3) {
        context.addIssue({
          code: "custom",
          message: "Polygon rings require at least three distinct positions"
        });
      }
    }
  });

export const createParcelSchema = z.object({
  parcelCode: z.string().min(3).max(64),
  state: z.string().min(2),
  lga: z.string().min(2),
  address: z.string().min(3),
  tenureType: z.enum(["STATUTORY", "CUSTOMARY"]),
  geometry: polygonSchema
});

export const submitApplicationSchema = z.object({
  parcelId: z.string().uuid(),
  claimDescription: z.string().min(10).max(5000)
});

export const fieldApplicationSchema = createParcelSchema.extend({
  claimDescription: z.string().min(10).max(5000),
  capturedAt: z.string().datetime()
});

export const transitionSchema = z.object({
  to: z.enum(applicationStatuses),
  reason: z.string().min(3).max(1000)
});

export type CreateParcelInput = z.infer<typeof createParcelSchema>;
export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;
export type FieldApplicationInput = z.infer<typeof fieldApplicationSchema>;
export type TransitionInput = z.infer<typeof transitionSchema>;
