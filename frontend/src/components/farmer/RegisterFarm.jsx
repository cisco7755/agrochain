// The actual AgroChain.sol has no registerFarm function.
// Farm info comes from the actor record set by the admin.
// This component just displays the farmer's registered profile.
import { useEffect, useState } from 'react';
import { useContract } from '../../hooks/useContract';
import { formatTimestamp } from '../../utils/hashUtils';

const RegisterFarm = ({ account }) => {
  const [actor, setActor] = useState(null);
  const [loading, setLoading] = useState(true);
  const { getAgroChain } = useContract();

  useEffect(() => {
    const fetch = async () => {
      try {
        const contract = getAgroChain();
        const data = await contract.getActor(account);
        setActor(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [account]);

  if (loading) return (
    <div className="bg-white rounded-lg shadow p-6 flex items-center gap-2 text-gray-500 text-sm">
      <span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      Loading profile...
    </div>
  );

  if (!actor?.isActive) return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-gray-500 text-sm">Your account has not been activated by an administrator yet.</p>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">My Farm Profile</h2>
      <div className="space-y-3">
        <div className="flex justify-between border-b pb-2">
          <span className="text-gray-500 text-sm">Farm / Actor Name</span>
          <span className="font-medium text-sm">{actor.name}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-gray-500 text-sm">Location</span>
          <span className="font-medium text-sm">{actor.location}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-gray-500 text-sm">Status</span>
          <span className="text-green-700 font-medium text-sm">Active</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 text-sm">Registered</span>
          <span className="font-medium text-sm">{formatTimestamp(actor.registeredAt?.toNumber())}</span>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-4">
        Farm profile is managed by the AgroChain administrator.
      </p>
    </div>
  );
};

export default RegisterFarm;
