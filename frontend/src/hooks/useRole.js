import { useState, useEffect } from 'react';
import { useContract } from './useContract';
import { ROLES } from '../config/constants';

export const useRole = (account) => {
  const [role, setRole] = useState(null);
  const [roleName, setRoleName] = useState('NONE');
  const [isActive, setIsActive] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { getAgroChain } = useContract();

  useEffect(() => {
    const fetchRole = async () => {
      if (!account) { setLoading(false); return; }
      try {
        const contract = getAgroChain();
        const [actor, adminAddress] = await Promise.all([
          contract.getActor(account),
          contract.admin(),
        ]);
        const roleNum = parseInt(actor.role.toString());
        setRole(roleNum);
        setRoleName(ROLES[roleNum] || 'NONE');
        setIsActive(actor.isActive);
        setIsAdmin(adminAddress.toLowerCase() === account.toLowerCase());
      } catch (err) {
        console.error('Role fetch failed:', err);
        setRoleName('NONE');
        setIsActive(false);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    fetchRole();
  }, [account]);

  return { role, roleName, isActive, isAdmin, loading };
};
