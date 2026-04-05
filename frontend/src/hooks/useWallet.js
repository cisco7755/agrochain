import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_CONFIG, } from '../config/contracts';
import { SEPOLIA_PARAMS } from '../config/constants';

export const useWallet = () => {
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkNetwork = async () => {
    if (!window.ethereum) return false;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const network = await provider.getNetwork();
    const correct = network.chainId === CONTRACT_CONFIG.chainId;
    setIsCorrectNetwork(correct);
    if (!correct) {
      setError('Wrong network. Please switch to Sepolia testnet.');
    } else {
      setError(null);
    }
    return correct;
  };

  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_PARAMS.chainId }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [SEPOLIA_PARAMS],
        });
      } else {
        throw switchError;
      }
    }
    await checkNetwork();
  };

  const connectWallet = async () => {
    try {
      setError(null);
      if (!window.ethereum) {
        setError('MetaMask not installed. Please install MetaMask to use AgroChain.');
        return;
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setIsConnected(true);
      await checkNetwork();
    } catch (err) {
      if (err.code === 4001) {
        setError('Connection rejected. Please approve MetaMask to continue.');
      } else {
        setError('Wallet connection failed: ' + err.message);
      }
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setIsConnected(false);
    setIsCorrectNetwork(false);
  };

  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) { setLoading(false); return; }
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          await checkNetwork();
        }
      } catch {}
      setLoading(false);
    };
    init();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setAccount(null);
          setIsConnected(false);
        } else {
          setAccount(accounts[0]);
          setIsConnected(true);
        }
      });
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
    return () => {
      if (window.ethereum?.removeAllListeners) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  return {
    account, isConnected, isCorrectNetwork, error, loading,
    connectWallet, disconnectWallet, switchToSepolia,
  };
};
