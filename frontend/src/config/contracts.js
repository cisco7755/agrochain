import AgroChainABI from '../abis/AgroChain.json';

export const CONTRACT_CONFIG = {
  agroChain: {
    address: import.meta.env.VITE_AGROCHAIN_ADDRESS || '',
    abi: AgroChainABI,
  },
  chainId: parseInt(import.meta.env.VITE_CHAIN_ID || '80002'),
  networkName: import.meta.env.VITE_NETWORK_NAME || 'amoy',
};
