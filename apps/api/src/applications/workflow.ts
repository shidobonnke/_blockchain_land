import { ApplicationStatus, Role } from "@prisma/client";

type Rule = { to: ApplicationStatus; roles: Role[] };
export const workflow: Record<ApplicationStatus, Rule[]> = {
  DRAFT: [{ to: "SUBMITTED", roles: ["CITIZEN", "LAND_ADMINISTRATOR"] }],
  SUBMITTED: [
    { to: "SPATIAL_REVIEW", roles: ["LAND_ADMINISTRATOR", "SURVEYOR"] },
    { to: "REJECTED", roles: ["LAND_ADMINISTRATOR"] }
  ],
  SPATIAL_REVIEW: [
    { to: "COMMUNITY_REVIEW", roles: ["SURVEYOR"] },
    { to: "LEGAL_REVIEW", roles: ["SURVEYOR"] },
    { to: "REJECTED", roles: ["SURVEYOR"] }
  ],
  COMMUNITY_REVIEW: [
    { to: "LEGAL_REVIEW", roles: ["COMMUNITY_REPRESENTATIVE", "LAND_ADMINISTRATOR"] },
    { to: "REJECTED", roles: ["LAND_ADMINISTRATOR"] }
  ],
  LEGAL_REVIEW: [
    { to: "REGISTRAR_REVIEW", roles: ["LEGAL_OFFICER"] },
    { to: "REJECTED", roles: ["LEGAL_OFFICER"] }
  ],
  REGISTRAR_REVIEW: [
    { to: "BLOCKCHAIN_PENDING", roles: ["REGISTRAR"] },
    { to: "REJECTED", roles: ["REGISTRAR"] }
  ],
  BLOCKCHAIN_PENDING: [{ to: "MINTED", roles: ["SYSTEM_ADMIN", "REGISTRAR"] }],
  MINTED: [],
  REJECTED: [],
  CANCELLED: []
};

export function canTransition(from: ApplicationStatus, to: ApplicationStatus, role: Role) {
  return workflow[from].some((rule) => rule.to === to && rule.roles.includes(role));
}
