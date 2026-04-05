export const ROLES = {
  0: 'NONE',
  1: 'ADMIN',
  2: 'FARMER',
  3: 'CERTIFIER',
  4: 'DISTRIBUTOR',
  5: 'RETAILER',
  6: 'CONSUMER',
};

export const ROLE_NUMBERS = {
  NONE: 0,
  ADMIN: 1,
  FARMER: 2,
  CERTIFIER: 3,
  DISTRIBUTOR: 4,
  RETAILER: 5,
  CONSUMER: 6,
};

export const BATCH_STATUS = {
  0: 'Pending Certification',
  1: 'Certified',
  2: 'Rejected',
  3: 'In Transit',
  4: 'Delivered',
  5: 'Received',
  6: 'Listed for Sale',
};

export const PRODUCT_CATEGORIES = ['Food', 'Cosmetic', 'Textile', 'Herbal', 'Other'];

export const SEPOLIA_ETHERSCAN = 'https://sepolia.etherscan.io';

export const SEPOLIA_PARAMS = {
  chainId: '0xaa36a7',
  chainName: 'Sepolia Test Network',
  nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://rpc.sepolia.org'],
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
};
