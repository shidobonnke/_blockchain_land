import { z } from "zod";

export const roles = [
  "CITIZEN", "SURVEYOR", "COMMUNITY_REPRESENTATIVE", "LAND_ADMINISTRATOR",
  "LEGAL_OFFICER", "REGISTRAR", "GOVERNOR", "JUDICIARY", "AUDITOR", "SYSTEM_ADMIN"
] as const;
export type Role = typeof roles[number];

export const parcelStatuses = [
  "UNREGISTERED", "PENDING", "SPATIALLY_VERIFIED", "COMMUNITY_VALIDATED",
  "APPROVED", "ACTIVE", "REJECTED", "DISPUTED", "SUSPENDED", "TRANSFERRED", "REVOKED"
] as const;
export type ParcelStatus = typeof parcelStatuses[number];

export const applicationStatuses = [
  "DRAFT", "SUBMITTED", "SPATIAL_REVIEW", "COMMUNITY_REVIEW", "LEGAL_REVIEW",
  "REGISTRAR_REVIEW", "BLOCKCHAIN_PENDING", "MINTED", "REJECTED", "CANCELLED"
] as const;
export type ApplicationStatus = typeof applicationStatuses[number];

export const polygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))).min(1)
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
  applicantId: z.string().uuid(),
  claimDescription: z.string().min(10).max(5000)
});

export const transitionSchema = z.object({
  to: z.enum(applicationStatuses),
  reason: z.string().min(3).max(1000),
  actorId: z.string().uuid()
});

export type CreateParcelInput = z.infer<typeof createParcelSchema>;
export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;
export type TransitionInput = z.infer<typeof transitionSchema>;
