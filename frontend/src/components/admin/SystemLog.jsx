import { useState, useEffect } from 'react';
import { useContract } from '../../hooks/useContract';
import { ROLES } from '../../config/constants';
import { shortenAddress, etherscanTxUrl } from '../../utils/hashUtils';
import { ethers } from 'ethers';

const SystemLog = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getUserRegistry, getProductTrace } = useContract();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const registry = getUserRegistry();
        const trace = getProductTrace();
        const provider = registry.provider;
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 5000);

        const [registered, roleUpdated, suspended, batchCreated, certified] = await Promise.all([
          registry.queryFilter(registry.filters.UserRegistered(), fromBlock),
          registry.queryFilter(registry.filters.RoleUpdated(), fromBlock),
          registry.queryFilter(registry.filters.UserSuspended(), fromBlock),
          trace.queryFilter(trace.filters.BatchCreated(), fromBlock),
          trace.queryFilter(trace.filters.BatchCertified(), fromBlock),
        ]);

        const allEvents = [
          ...registered.map(e => ({ type: 'UserRegistered', txHash: e.transactionHash, blockNumber: e.blockNumber, data: `${shortenAddress(e.args.user)} registered as ${ROLES[e.args.role]}` })),
          ...roleUpdated.map(e => ({ type: 'RoleUpdated', txHash: e.transactionHash, blockNumber: e.blockNumber, data: `${shortenAddress(e.args.user)} role changed to ${ROLES[e.args.newRole]}` })),
          ...suspended.map(e => ({ type: 'UserSuspended', txHash: e.transactionHash, blockNumber: e.blockNumber, data: `${shortenAddress(e.args.user)} suspended` })),
          ...batchCreated.map(e => ({ type: 'BatchCreated', txHash: e.transactionHash, blockNumber: e.blockNumber, data: `Batch created: ${e.args.product} by ${shortenAddress(e.args.farmer)}` })),
          ...certified.map(e => ({ type: 'BatchCertified', txHash: e.transactionHash, blockNumber: e.blockNumber, data: `Batch certified by ${shortenAddress(e.args.certifier)}` })),
        ].sort((a, b) => b.blockNumber - a.blockNumber);

        setEvents(allEvents);
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const typeColor = {
    UserRegistered: 'bg-green-100 text-green-800',
    RoleUpdated: 'bg-blue-100 text-blue-800',
    UserSuspended: 'bg-red-100 text-red-800',
    BatchCreated: 'bg-yellow-100 text-yellow-800',
    BatchCertified: 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">System Activity Log</h2>
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          Loading on-chain events...
        </div>
      ) : events.length === 0 ? (
        <p className="text-gray-500 text-sm">No recent activity found (last 5000 blocks).</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {events.map((e, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${typeColor[e.type] || 'bg-gray-100 text-gray-800'}`}>
                {e.type}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{e.data}</p>
                <a href={etherscanTxUrl(e.txHash)} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-green-600 underline">
                  Block #{e.blockNumber}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SystemLog;
