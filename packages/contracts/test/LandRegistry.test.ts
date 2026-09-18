import { expect } from "chai";
import { ethers } from "hardhat";

describe("LandRegistry", function () {
  async function fixture() {
    const [
      admin,
      owner,
      buyer,
      governor,
      judiciary,
      validator1,
      validator2,
      validator3,
      validator4
    ] = await ethers.getSigners();
    const token = await ethers.deployContract("LandTitleNFT", [admin.address]);
    const registry = await ethers.deployContract("LandRegistry", [
      admin.address,
      await token.getAddress()
    ]);
    await token.grantRole(await token.REGISTRY_ROLE(), await registry.getAddress());
    await registry.grantRole(await registry.GOVERNOR_ROLE(), governor.address);
    await registry.grantRole(await registry.JUDICIARY_ROLE(), judiciary.address);
    for (const validator of [validator1, validator2, validator3, validator4])
      await registry.addValidator(validator.address);
    return {
      admin,
      owner,
      buyer,
      governor,
      judiciary,
      validator1,
      validator2,
      validator3,
      validator4,
      token,
      registry
    };
  }

  it("issues a unique, non-user-transferable title", async () => {
    const { owner, buyer, token, registry } = await fixture();
    const parcel = ethers.id("AN-LA-001");
    await expect(
      registry.issueTitle(parcel, ethers.id("geometry"), ethers.id("metadata"), owner.address)
    ).to.emit(registry, "TitleIssued");
    expect(await token.ownerOf(1)).to.equal(owner.address);
    await expect(
      token.connect(owner).transferFrom(owner.address, buyer.address, 1)
    ).to.be.revertedWith("Registry transfer required");
    await expect(
      registry.issueTitle(parcel, ethers.id("geometry"), ethers.id("metadata"), owner.address)
    ).to.be.revertedWith("Parcel already titled");
  });

  it("requires governor and judiciary before revocation", async () => {
    const { owner, governor, judiciary, validator1, validator2, validator3, validator4, registry } =
      await fixture();
    const parcel = ethers.id("AN-LA-002");
    await registry.issueTitle(parcel, ethers.id("geometry"), ethers.id("metadata"), owner.address);
    await expect(registry.executeRevocation(parcel)).to.be.revertedWith("Approvals incomplete");
    await registry.connect(governor).requestRevocation(parcel, ethers.id("public-interest"));
    await expect(registry.executeRevocation(parcel)).to.be.revertedWith("Approvals incomplete");
    for (const validator of [validator1, validator2, validator3])
      await registry.connect(validator).voteRevocation(parcel);
    await expect(registry.connect(judiciary).approveRevocation(parcel)).to.be.revertedWith(
      "Super-majority incomplete"
    );
    await registry.connect(validator4).voteRevocation(parcel);
    await registry.connect(judiciary).approveRevocation(parcel);
    await expect(registry.executeRevocation(parcel)).to.emit(registry, "TitleRevoked");
  });

  it("allows only registry-controlled transfers and locks disputed titles", async () => {
    const { admin, owner, buyer, registry } = await fixture();
    const parcel = ethers.id("AN-LA-003");
    await registry.issueTitle(parcel, ethers.id("geometry"), ethers.id("metadata"), owner.address);
    await registry.grantRole(await registry.LEGAL_ROLE(), admin.address);
    await registry.setDisputed(parcel, true, ethers.id("evidence"));
    await expect(registry.transferTitle(parcel, buyer.address)).to.be.revertedWith("Title locked");
    await registry.setDisputed(parcel, false, ethers.id("resolution"));
    await expect(registry.transferTitle(parcel, buyer.address)).to.emit(
      registry,
      "TitleTransferred"
    );
  });

  it("prevents duplicate validator votes", async () => {
    const { owner, governor, validator1, registry } = await fixture();
    const parcel = ethers.id("AN-LA-004");
    await registry.issueTitle(parcel, ethers.id("geometry"), ethers.id("metadata"), owner.address);
    await registry.connect(governor).requestRevocation(parcel, ethers.id("public-interest"));
    await registry.connect(validator1).voteRevocation(parcel);
    await expect(registry.connect(validator1).voteRevocation(parcel)).to.be.revertedWith(
      "Validator already voted"
    );
  });

  it("rejects a revocation request from a non-Governor address", async () => {
    const { owner, registry } = await fixture();
    const parcel = ethers.id("AN-LA-005");
    await registry.issueTitle(parcel, ethers.id("geometry"), ethers.id("metadata"), owner.address);
    await expect(registry.connect(owner).requestRevocation(parcel, ethers.id("public-interest"))).to
      .be.reverted;
  });

  it("rejects transfer attempts after a title is revoked", async () => {
    const {
      owner,
      buyer,
      governor,
      judiciary,
      validator1,
      validator2,
      validator3,
      validator4,
      token,
      registry
    } = await fixture();
    const parcel = ethers.id("AN-LA-006");
    await registry.issueTitle(parcel, ethers.id("geometry"), ethers.id("metadata"), owner.address);
    await registry.connect(governor).requestRevocation(parcel, ethers.id("public-interest"));
    for (const validator of [validator1, validator2, validator3, validator4])
      await registry.connect(validator).voteRevocation(parcel);
    await registry.connect(judiciary).approveRevocation(parcel);
    await registry.executeRevocation(parcel);
    await expect(registry.transferTitle(parcel, buyer.address)).to.be.revertedWith("Title locked");
    await expect(token.connect(owner).transferFrom(owner.address, buyer.address, 1)).to.be.reverted;
  });
});
