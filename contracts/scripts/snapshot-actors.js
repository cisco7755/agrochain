// Snapshots every active actor from the currently-deployed contract before
// a --fresh redeploy destroys the chain. Run BEFORE the old Hardhat node is
// killed — there is no other way to recover this data afterward.
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  const deploymentPath = path.join(__dirname, "..", "deployments", "latest.json");
  const snapshotPath = path.join(__dirname, "..", "deployments", "actors-snapshot.json");

  if (!fs.existsSync(deploymentPath)) {
    console.log("No existing deployment — nothing to snapshot.");
    return;
  }

  const abiPath = path.join(__dirname, "..", "artifacts", "contracts", "AgroChain.sol", "AgroChain.json");
  if (!fs.existsSync(abiPath)) {
    console.log("No compiled ABI yet — nothing to snapshot.");
    return;
  }

  const { contractAddress } = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const abi = JSON.parse(fs.readFileSync(abiPath, "utf8")).abi;

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const contract = new ethers.Contract(contractAddress, abi, provider);

  let addresses;
  try {
    const events = await contract.queryFilter(contract.filters.ActorRegistered());
    addresses = [...new Set(events.map((e) => e.args.actorAddress))];
  } catch (e) {
    console.log("Could not read chain (nothing running?) — nothing to snapshot.");
    return;
  }

  const actors = [];
  for (const address of addresses) {
    try {
      const a = await contract.getActor(address);
      if (a.isActive && Number(a.role) > 0) {
        actors.push({ address, name: a.name, role: Number(a.role), location: a.location });
      }
    } catch {}
  }

  fs.writeFileSync(snapshotPath, JSON.stringify(actors, null, 2));
  console.log(`Snapshotted ${actors.length} active actor(s) from ${contractAddress}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
