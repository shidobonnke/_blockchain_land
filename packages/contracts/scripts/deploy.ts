import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const token = await ethers.deployContract("LandTitleNFT", [deployer.address]);
  await token.waitForDeployment();
  const registry = await ethers.deployContract("LandRegistry", [deployer.address, await token.getAddress()]);
  await registry.waitForDeployment();
  await (await token.grantRole(await token.REGISTRY_ROLE(), await registry.getAddress())).wait();
  console.log(JSON.stringify({
    deployer: deployer.address,
    titleNFT: await token.getAddress(),
    landRegistry: await registry.getAddress()
  }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
