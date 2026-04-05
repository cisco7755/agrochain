// scripts/deploy.js
// Run with: npx hardhat run scripts/deploy.js --network <network>

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Role enum values must match AgroChain.sol
const Role = {
  NONE: 0,
  FARMER: 1,
  PROCESSOR: 2,
  DISTRIBUTOR: 3,
  RETAILER: 4,
  CERTIFIER: 5,
};

const SAMPLE_ACTORS = [
  {
    name: "Green Valley Farm",
    role: Role.FARMER,
    location: "Nairobi, Kenya",
  },
  {
    name: "Swift Logistics Ltd",
    role: Role.DISTRIBUTOR,
    location: "Mombasa, Kenya",
  },
  {
    name: "OrganicCert Africa",
    role: Role.CERTIFIER,
    location: "Kampala, Uganda",
  },
];

async function main() {
  // ------------------------------------------------------------------
  // 1. Get signers — deployer is admin; generate extra wallets for demo
  // ------------------------------------------------------------------
  const [deployer, farmer, distributor, certifier] =
    await ethers.getSigners();

  console.log("=".repeat(60));
  console.log("  AgroChain Deployment");
  console.log("=".repeat(60));
  console.log(`Deployer (admin) : ${deployer.address}`);
  console.log(`Farmer wallet    : ${farmer.address}`);
  console.log(`Distributor wallet: ${distributor.address}`);
  console.log(`Certifier wallet : ${certifier.address}`);
  console.log("-".repeat(60));

  // ------------------------------------------------------------------
  // 2. Deploy AgroChain
  // ------------------------------------------------------------------
  const AgroChain = await ethers.getContractFactory("AgroChain");
  const agroChain = await AgroChain.deploy();
  await agroChain.waitForDeployment();

  const contractAddress = await agroChain.getAddress();
  console.log(`AgroChain deployed to: ${contractAddress}`);

  // ------------------------------------------------------------------
  // 3. Register 3 sample actors (deployer is admin)
  // ------------------------------------------------------------------
  const actorAddresses = [
    farmer.address,
    distributor.address,
    certifier.address,
  ];

  console.log("\nRegistering sample actors...");
  for (let i = 0; i < SAMPLE_ACTORS.length; i++) {
    const { name, role, location } = SAMPLE_ACTORS[i];
    const actorAddress = actorAddresses[i];

    const tx = await agroChain.registerActor(
      actorAddress,
      name,
      role,
      location
    );
    await tx.wait();

    const roleName = Object.keys(Role).find((key) => Role[key] === role);
    console.log(
      `  [${roleName}] ${name} — ${actorAddress} (${location})`
    );
  }

  // ------------------------------------------------------------------
  // 4. Persist deployment info
  // ------------------------------------------------------------------
  const network = await ethers.provider.getNetwork();
  const deploymentInfo = {
    network: {
      name: network.name,
      chainId: network.chainId.toString(),
    },
    contractAddress,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    actors: SAMPLE_ACTORS.map((actor, i) => ({
      ...actor,
      address: actorAddresses[i],
      role: Object.keys(Role).find((key) => Role[key] === actor.role),
    })),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const outputPath = path.join(deploymentsDir, "latest.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("  Deployment complete");
  console.log("=".repeat(60));
  console.log(`Contract address : ${contractAddress}`);
  console.log(`Network          : ${network.name} (chainId ${network.chainId})`);
  console.log(`Deployment info  : deployments/latest.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
