import { ethers } from 'ethers';

export const generateBatchHash = (farmId, product, date, farmerAddress) => {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'string', 'uint256', 'address'],
      [farmId, product, date, farmerAddress]
    )
  );
};

export const shortenHash = (hash, chars = 6) => {
  if (!hash) return '';
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
};

export const shortenAddress = (address, chars = 4) => {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

export const formatTimestamp = (timestamp) => {
  if (!timestamp || timestamp === 0) return 'Not recorded';
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const toUnixTimestamp = (dateString) => {
  return Math.floor(new Date(dateString).getTime() / 1000);
};

export const etherscanTxUrl = (txHash) => {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
};

export const etherscanAddressUrl = (address) => {
  return `https://sepolia.etherscan.io/address/${address}`;
};
