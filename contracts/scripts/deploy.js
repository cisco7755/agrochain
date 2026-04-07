const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const Role = { NONE: 0, FARMER: 1, PROCESSOR: 2, DISTRIBUTOR: 3, RETAILER: 4, CERTIFIER: 5 };

const SAMPLE_ACTORS = [
  { name: "Green Valley Farm", role: Role.FARMER, location: "Nairobi, Kenya" },
  { name: "Swift Logistics Ltd", role: Role.DISTRIBUTOR, location: "Mombasa, Kenya" },
  { name: "OrganicCert Africa", role: Role.CERTIFIER, location: "Kampala, Uganda" },
];

async function main() {
  const [deployer, farmer, distributor, certifier] = await ethers.getSigners();

  console.log("=".repeat(60));
  console.log("  AgroChain Deployment");
  console.log("=".repeat(60));
  console.log(`Deployer (admin) : ${deployer.address}`);
  console.log(`Farmer wallet    : ${farmer.address}`);
  console.log(`Distributor      : ${distributor.address}`);
  console.log(`Certifier        : ${certifier.address}`);
  console.log("-".repeat(60));

  const AgroChain = await ethers.getContractFactory("AgroChain");
  const agroChain = await AgroChain.deploy();
  await agroChain.deploymentTransaction().wait();
  const contractAddress = await agroChain.getAddress();

  console.log(`AgroChain deployed to: ${contractAddress}`);

  const actorAddresses = [farmer.address, distributor.address, certifier.address];
  console.log("\nRegistering sample actors...");
  for (let i = 0; i < SAMPLE_ACTORS.length; i++) {
    const { name, role, location } = SAMPLE_ACTORS[i];
    const tx = await agroChain.registerActor(actorAddresses[i], name, role, location);
    await tx.wait();
    const roleName = Object.keys(Role).find((k) => Role[k] === role);
    console.log(`  [${roleName}] ${name} — ${actorAddresses[i]}`);
  }

  const network = await ethers.provider.getNetwork();
  const deploymentInfo = {
    network: { name: network.name, chainId: network.chainId.toString() },
    contractAddress,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    actors: SAMPLE_ACTORS.map((a, i) => ({
      ...a, address: actorAddresses[i],
      role: Object.keys(Role).find((k) => Role[k] === a.role),
    })),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });
  fs.writeFileSync(path.join(deploymentsDir, "latest.json"), JSON.stringify(deploymentInfo, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("  Deployment complete");
  console.log("=".repeat(60));
  console.log(`Contract: ${contractAddress}`);
  console.log(`ChainId : ${network.chainId}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
