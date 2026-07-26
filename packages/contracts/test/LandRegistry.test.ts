import { expect } from "chai";
import { ethers } from "hardhat";

describe("LandRegistry", function () {
  async function fixture() {
    const [admin, owner, buyer, governor, judiciary] = await ethers.getSigners();
    const token = await ethers.deployContract("LandTitleNFT", [admin.address]);
    const registry = await ethers.deployContract("LandRegistry", [admin.address, await token.getAddress()]);
    await token.grantRole(await token.REGISTRY_ROLE(), await registry.getAddress());
    await registry.grantRole(await registry.GOVERNOR_ROLE(), governor.address);
    await registry.grantRole(await registry.JUDICIARY_ROLE(), judiciary.address);
    return { admin, owner, buyer, governor, judiciary, token, registry };
  }

  it("issues a unique, non-user-transferable title", async () => {
    const { owner, buyer, token, registry } = await fixture();
    const parcel = ethers.id("AN-LA-001");
    await expect(registry.issueTitle(parcel, ethers.id("geometry"), ethers.id("metadata"), owner.address))
      .to.emit(registry, "TitleIssued");
    expect(await token.ownerOf(1)).to.equal(owner.address);
    await expect(token.connect(owner).transferFrom(owner.address, buyer.address, 1))
      .to.be.revertedWith("Registry transfer required");
    await expect(registry.issueTitle(parcel, ethers.id("geometry"), ethers.id("metadata"), owner.address))
      .to.be.revertedWith("Parcel already titled");
  });

  it("requires governor and judiciary before revocation", async () => {
    const { owner, governor, judiciary, registry } = await fixture();
    const parcel = ethers.id("AN-LA-002");
    await registry.issueTitle(parcel, ethers.id("geometry"), ethers.id("metadata"), owner.address);
    await expect(registry.executeRevocation(parcel)).to.be.revertedWith("Approvals incomplete");
    await registry.connect(governor).requestRevocation(parcel, ethers.id("public-interest"));
    await expect(registry.executeRevocation(parcel)).to.be.revertedWith("Approvals incomplete");
    await registry.connect(judiciary).approveRevocation(parcel);
    await expect(registry.executeRevocation(parcel)).to.emit(registry, "TitleRevoked");
  });
});
