import UserRegistryABI from '../abis/UserRegistry.json';
import ProductTraceABI from '../abis/ProductTrace.json';

export const CONTRACT_CONFIG = {
  userRegistry: {
    address: import.meta.env.VITE_USER_REGISTRY_ADDRESS || '',
    abi: UserRegistryABI,
  },
  productTrace: {
    address: import.meta.env.VITE_PRODUCT_TRACE_ADDRESS || '',
    abi: ProductTraceABI,
  },
  chainId: parseInt(import.meta.env.VITE_CHAIN_ID || '11155111'),
  networkName: import.meta.env.VITE_NETWORK_NAME || 'sepolia',
};
