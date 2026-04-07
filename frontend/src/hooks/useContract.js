import { ethers } from 'ethers';
import { CONTRACT_CONFIG } from '../config/contracts';

export const useContract = () => {
  const getProvider = () => {
    if (!window.ethereum) throw new Error('MetaMask not installed');
    return new ethers.providers.Web3Provider(window.ethereum);
  };

  const getSigner = () => getProvider().getSigner();

  const getAgroChain = (withSigner = false) => {
    const providerOrSigner = withSigner ? getSigner() : getProvider();
    return new ethers.Contract(
      CONTRACT_CONFIG.agroChain.address,
      CONTRACT_CONFIG.agroChain.abi,
      providerOrSigner
    );
  };

  return { getAgroChain, getSigner, getProvider };
};
