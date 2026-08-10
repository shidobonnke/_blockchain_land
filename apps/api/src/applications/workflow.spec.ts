import { canTransition, tenureAllowsReviewRoute } from "./workflow";

describe("land application workflow", () => {
  it("allows only the surveyor to advance a spatial review", () => {
    expect(canTransition("SPATIAL_REVIEW", "COMMUNITY_REVIEW", "SURVEYOR")).toBe(true);
    expect(canTransition("SPATIAL_REVIEW", "COMMUNITY_REVIEW", "CITIZEN")).toBe(false);
  });
  it("requires a registrar for blockchain submission", () => {
    expect(canTransition("REGISTRAR_REVIEW", "BLOCKCHAIN_PENDING", "REGISTRAR")).toBe(true);
    expect(canTransition("REGISTRAR_REVIEW", "BLOCKCHAIN_PENDING", "LEGAL_OFFICER")).toBe(false);
  });
  it("does not permit transitions after minting", () => {
    expect(canTransition("MINTED", "REJECTED", "SYSTEM_ADMIN")).toBe(false);
  });
  it("requires community review for customary tenure", () => {
    expect(tenureAllowsReviewRoute("CUSTOMARY", "LEGAL_REVIEW")).toBe(false);
    expect(tenureAllowsReviewRoute("CUSTOMARY", "COMMUNITY_REVIEW")).toBe(true);
  });
  it("routes statutory tenure directly to legal review", () => {
    expect(tenureAllowsReviewRoute("STATUTORY", "COMMUNITY_REVIEW")).toBe(false);
    expect(tenureAllowsReviewRoute("STATUTORY", "LEGAL_REVIEW")).toBe(true);
  });
});
