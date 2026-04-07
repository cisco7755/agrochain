import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_CONFIG } from '../config/contracts';
import { AMOY_PARAMS, LOCALHOST_PARAMS } from '../config/constants';

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
    if (!correct) setError('Wrong network. Please switch to Polygon Amoy testnet.');
    else setError(null);
    return correct;
  };

  const switchToAmoy = async () => {
    const isLocalhost = CONTRACT_CONFIG.chainId === 31337;
    const params = isLocalhost ? LOCALHOST_PARAMS : AMOY_PARAMS;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: params.chainId }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [params],
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
      localStorage.removeItem('agrochain_disconnected');
      setAccount(accounts[0]);
      setIsConnected(true);
      await checkNetwork();
    } catch (err) {
      if (err.code === 4001) setError('Connection rejected. Please approve MetaMask to continue.');
      else setError('Wallet connection failed: ' + err.message);
    }
  };

  const disconnectWallet = () => {
    localStorage.setItem('agrochain_disconnected', '1');
    setAccount(null);
    setIsConnected(false);
    setIsCorrectNetwork(false);
  };

  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) { setLoading(false); return; }
      // If user manually disconnected, stay disconnected until they reconnect
      if (localStorage.getItem('agrochain_disconnected')) { setLoading(false); return; }
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
        if (accounts.length === 0) { setAccount(null); setIsConnected(false); }
        else { setAccount(accounts[0]); setIsConnected(true); }
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
    connectWallet, disconnectWallet, switchToSepolia: switchToAmoy,
  };
};
