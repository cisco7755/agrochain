import { CONTRACT_CONFIG } from '../config/contracts';

export const generateQRPayload = (batchHash, contractAddress) => {
  return JSON.stringify({
    batchHash,
    contract: contractAddress || CONTRACT_CONFIG.productTrace.address,
    network: 'sepolia',
    verifyUrl: `${window.location.origin}/verify/${batchHash}`,
  });
};

export const parseQRPayload = (qrString) => {
  try {
    const parsed = JSON.parse(qrString);
    if (parsed.batchHash && parsed.network) return parsed;
    return null;
  } catch {
    return null;
  }
};
