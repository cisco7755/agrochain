// Replays a snapshot taken by snapshot-actors.js onto a freshly deployed
// contract, so registered actors survive a --fresh redeploy instead of
// silently vanishing. Must run AFTER the new contract is deployed.
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const ADMIN_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

async function main() {
  const deploymentPath = path.join(__dirname, "..", "deployments", "latest.json");
  const snapshotPath = path.join(__dirname, "..", "deployments", "actors-snapshot.json");

  if (!fs.existsSync(snapshotPath)) {
    console.log("No actor snapshot to restore.");
    return;
  }

  const actors = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  if (actors.length === 0) {
    fs.unlinkSync(snapshotPath);
    console.log("Snapshot was empty — nothing to restore.");
    return;
  }

  const { contractAddress } = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const abiPath = path.join(__dirname, "..", "artifacts", "contracts", "AgroChain.sol", "AgroChain.json");
  const abi = JSON.parse(fs.readFileSync(abiPath, "utf8")).abi;

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const admin = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(contractAddress, abi, admin);

  let nonce = await provider.getTransactionCount(admin.address, "latest");
  let restored = 0;
  for (const actor of actors) {
    try {
      const existing = await contract.getActor(actor.address);
      if (Number(existing.role) > 0) continue; // already present (e.g. sample seed data)
      const tx = await contract.registerActor(actor.address, actor.name, actor.role, actor.location, { nonce: nonce++ });
      await tx.wait();
      restored++;
    } catch (e) {
      console.error(`  Failed to restore ${actor.name} (${actor.address}): ${e.message}`);
    }
  }

  // Archive rather than delete, so there's a record of what was carried
  // forward, but rename so a later unrelated reset never replays it again.
  fs.renameSync(snapshotPath, snapshotPath.replace(".json", ".applied.json"));
  console.log(`Restored ${restored} of ${actors.length} actor(s) onto ${contractAddress}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
