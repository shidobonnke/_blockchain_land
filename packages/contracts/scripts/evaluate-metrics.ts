import hardhat from "hardhat";

const { ethers } = hardhat;

const runs = Number(process.env.EVALUATION_SAMPLES ?? 30);
const [admin, owner, governor, judiciary, ...validators] = await ethers.getSigners();
const token = await ethers.deployContract("LandTitleNFT", [admin.address]);
const registry = await ethers.deployContract("LandRegistry", [
  admin.address,
  await token.getAddress()
]);
await token.grantRole(await token.REGISTRY_ROLE(), await registry.getAddress());
await registry.grantRole(await registry.GOVERNOR_ROLE(), governor.address);
await registry.grantRole(await registry.JUDICIARY_ROLE(), judiciary.address);
for (const validator of validators.slice(0, 4)) await registry.addValidator(validator.address);

const observations = [];
for (let run = 1; run <= runs; run++) {
  const parcel = ethers.id(`ANAGU-EVALUATION-${run}`);
  await registry.issueTitle(
    parcel,
    ethers.id(`geometry-${run}`),
    ethers.id(`metadata-${run}`),
    owner.address
  );
  await registry.connect(governor).requestRevocation(parcel, ethers.id(`public-interest-${run}`));
  for (const validator of validators.slice(0, 4))
    await registry.connect(validator).voteRevocation(parcel);
  await registry.connect(judiciary).approveRevocation(parcel);
  const started = performance.now();
  const transaction = await registry.executeRevocation(parcel);
  const receipt = await transaction.wait();
  observations.push({
    run,
    gasUsed: Number(receipt?.gasUsed ?? 0n),
    confirmationMs: performance.now() - started
  });
}

console.log(`ANAGU_METRICS=${JSON.stringify(observations)}`);
