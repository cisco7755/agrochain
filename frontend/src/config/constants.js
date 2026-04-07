// Matches AgroChain.sol Role enum exactly
export const ROLES = {
  0: 'NONE',
  1: 'FARMER',
  2: 'PROCESSOR',
  3: 'DISTRIBUTOR',
  4: 'RETAILER',
  5: 'CERTIFIER',
};

export const ROLE_NUMBERS = {
  NONE: 0,
  FARMER: 1,
  PROCESSOR: 2,
  DISTRIBUTOR: 3,
  RETAILER: 4,
  CERTIFIER: 5,
};

// Matches AgroChain.sol EventType enum exactly
export const EVENT_TYPES = {
  0: 'Registered',
  1: 'Harvested',
  2: 'Processed',
  3: 'Packaged',
  4: 'Shipped',
  5: 'Received',
  6: 'Certified',
  7: 'Sold',
};

export const PRODUCT_TYPES = ['Grain', 'Vegetable', 'Fruit', 'Dairy', 'Meat', 'Cosmetic', 'Textile', 'Herbal', 'Other'];
export const PRODUCT_CATEGORIES = PRODUCT_TYPES; // alias

export const BATCH_STATUS = {
  0: 'Registered',
  1: 'Harvested',
  2: 'Processed',
  3: 'Packaged',
  4: 'In Transit',
  5: 'Received',
  6: 'Certified',
  7: 'Sold',
};

export const AMOY_PARAMS = {
  chainId: '0x13882',
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: ['https://rpc-amoy.polygon.technology/'],
  blockExplorerUrls: ['https://www.oklink.com/amoy'],
};

export const AMOY_EXPLORER = 'https://www.oklink.com/amoy';

export const LOCALHOST_PARAMS = {
  chainId: '0x7a69',
  chainName: 'Hardhat Local',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['http://127.0.0.1:8545'],
  blockExplorerUrls: [],
};
