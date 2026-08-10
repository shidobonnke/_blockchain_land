import { fieldApplicationSchema, polygonSchema, submitApplicationSchema } from "@anagu/shared";

describe("research requirement validation", () => {
  const polygon = {
    type: "Polygon" as const,
    coordinates: [
      [
        [7.0, 6.0],
        [7.1, 6.0],
        [7.1, 6.1],
        [7.0, 6.0]
      ]
    ]
  };

  it("accepts a closed cadastral polygon and rejects an open ring", () => {
    expect(polygonSchema.safeParse(polygon).success).toBe(true);
    expect(
      polygonSchema.safeParse({
        ...polygon,
        coordinates: [
          [
            [7, 6],
            [7.1, 6],
            [7.1, 6.1],
            [7, 6.1]
          ]
        ]
      }).success
    ).toBe(false);
  });

  it("does not accept a client-controlled applicant identity", () => {
    const parsed = submitApplicationSchema.parse({
      parcelId: "334c2101-e43a-4b2f-b096-e38e2fd57f76",
      applicantId: "c87053df-abb2-48b8-a274-f7e8b9ec98f4",
      claimDescription: "A sufficiently detailed ownership claim"
    });
    expect(parsed).not.toHaveProperty("applicantId");
  });

  it("requires complete offline data before synchronization", () => {
    expect(
      fieldApplicationSchema.safeParse({
        parcelCode: "AN-001",
        state: "Enugu",
        lga: "Nsukka",
        address: "Example village",
        tenureType: "CUSTOMARY",
        geometry: polygon,
        claimDescription: "Inherited through the documented family lineage",
        capturedAt: new Date().toISOString()
      }).success
    ).toBe(true);
  });
});
