import { createContext, useContext } from 'react';
import { useContract } from '../hooks/useContract';

const ContractContext = createContext(null);

export const ContractProvider = ({ children }) => {
  const contractUtils = useContract();
  return (
    <ContractContext.Provider value={contractUtils}>
      {children}
    </ContractContext.Provider>
  );
};

export const useContractContext = () => {
  const ctx = useContext(ContractContext);
  if (!ctx) throw new Error('useContractContext must be used inside ContractProvider');
  return ctx;
};
