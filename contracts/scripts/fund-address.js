const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const target = "0x5d56b575bb0ec230f19655defd548a50d00bb8c0";
  const amount = ethers.parseEther ? ethers.parseEther("10.0") : ethers.utils.parseEther("10.0");

  const tx = await deployer.sendTransaction({ to: target, value: amount });
  await tx.wait();

  const bal = await ethers.provider.getBalance(target);
  const fmt = ethers.formatEther ? ethers.formatEther : ethers.utils.formatEther;
  console.log(`Funded ${target} with 10 ETH`);
  console.log(`New balance: ${fmt(bal)} ETH`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
