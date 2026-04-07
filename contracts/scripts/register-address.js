const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const TARGET_ADDRESS = "0x5d56b575bb0ec230f19655defd548a50d00bb8c0";
const TARGET_ROLE = 1; // FARMER
const TARGET_NAME = "Dev User";
const TARGET_LOCATION = "Minna, Niger State";

async function main() {
  const deploymentPath = path.join(__dirname, "..", "deployments", "latest.json");
  if (!fs.existsSync(deploymentPath)) throw new Error("No deployment. Run deploy.js first.");

  const { contractAddress } = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const [deployer] = await ethers.getSigners();
  const AgroChain = await ethers.getContractFactory("AgroChain");
  const contract = AgroChain.attach(contractAddress);

  console.log(`Registering ${TARGET_ADDRESS}...`);
  const tx = await contract.connect(deployer).registerActor(TARGET_ADDRESS, TARGET_NAME, TARGET_ROLE, TARGET_LOCATION);
  await tx.wait();

  const roles = ["NONE", "FARMER", "PROCESSOR", "DISTRIBUTOR", "RETAILER", "CERTIFIER"];
  console.log(`Done — ${TARGET_ADDRESS} is now ${roles[TARGET_ROLE]}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
