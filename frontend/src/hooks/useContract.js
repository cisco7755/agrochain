import { ethers } from 'ethers';
import { CONTRACT_CONFIG } from '../config/contracts';

export const useContract = () => {
  const getProvider = () => {
    if (!window.ethereum) throw new Error('MetaMask not installed');
    return new ethers.providers.Web3Provider(window.ethereum);
  };

  const getSigner = () => getProvider().getSigner();

  const getUserRegistry = (withSigner = false) => {
    const providerOrSigner = withSigner ? getSigner() : getProvider();
    return new ethers.Contract(
      CONTRACT_CONFIG.userRegistry.address,
      CONTRACT_CONFIG.userRegistry.abi,
      providerOrSigner
    );
  };

  const getProductTrace = (withSigner = false) => {
    const providerOrSigner = withSigner ? getSigner() : getProvider();
    return new ethers.Contract(
      CONTRACT_CONFIG.productTrace.address,
      CONTRACT_CONFIG.productTrace.abi,
      providerOrSigner
    );
  };

  return { getUserRegistry, getProductTrace, getSigner, getProvider };
};
