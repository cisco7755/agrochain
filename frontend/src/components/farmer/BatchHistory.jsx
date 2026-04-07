import { useState, useEffect } from 'react';
import { useContract } from '../../hooks/useContract';
import { formatTimestamp } from '../../utils/hashUtils';
import toast from 'react-hot-toast';

const BatchHistory = ({ account }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getAgroChain } = useContract();

  useEffect(() => {
    const fetch = async () => {
      if (!account) return;
      try {
        const contract = getAgroChain();
        const provider = contract.provider;
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 10000);

        // Filter ProductRegistered events by this farmer's address
        const filter = contract.filters.ProductRegistered(null, null, account);
        const events = await contract.queryFilter(filter, fromBlock);

        const details = await Promise.all(
          events.map(async (e) => {
            try {
              const id = e.args.productId.toNumber();
              const product = await contract.getProduct(id);
              return { id, ...product };
            } catch {
              return null;
            }
          })
        );
        setProducts(details.filter(Boolean).reverse());
      } catch (err) {
        toast.error('Failed to load product history');
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
      Loading your products...
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">My Products ({products.length})</h2>
      {products.length === 0 ? (
        <p className="text-gray-500 text-sm">No products registered yet. Use the New Product tab to get started.</p>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <div key={p.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="font-semibold text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.productType} · Batch: {p.batchNumber}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {p.isOrganic && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Organic</span>}
                  {p.isCertified && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Certified</span>}
                </div>
              </div>
              <p className="text-xs text-gray-500">{p.farmLocation}</p>
              <p className="text-xs text-gray-400 mt-1">
                Harvest: {formatTimestamp(p.harvestDate?.toNumber())} ·
                Expiry: {formatTimestamp(p.expiryDate?.toNumber())}
              </p>
              <p className="text-xs font-mono text-gray-400 mt-1">Product ID: #{p.id}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BatchHistory;
