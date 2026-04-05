import { useState, useEffect } from 'react';
import { useContract } from './useContract';
import { ROLES } from '../config/constants';

export const useRole = (account) => {
  const [role, setRole] = useState(null);
  const [roleName, setRoleName] = useState('NONE');
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const { getUserRegistry } = useContract();

  useEffect(() => {
    const fetchRole = async () => {
      if (!account) { setLoading(false); return; }
      try {
        const registry = getUserRegistry();
        const [userRole, active] = await Promise.all([
          registry.userRoles(account),
          registry.isActive(account),
        ]);
        const roleNum = parseInt(userRole.toString());
        setRole(roleNum);
        setRoleName(ROLES[roleNum] || 'NONE');
        setIsActive(active);
      } catch (err) {
        console.error('Role fetch failed:', err);
        setRoleName('NONE');
        setIsActive(false);
      } finally {
        setLoading(false);
      }
    };
    fetchRole();
  }, [account]);

  return { role, roleName, isActive, loading };
};
