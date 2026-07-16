import { useState } from 'react';
import { useContract } from '../../hooks/useContract';
import { useIPFS } from '../../hooks/useIPFS';
import { PRODUCT_TYPES } from '../../config/constants';
import { toUnixTimestamp } from '../../utils/hashUtils';
import TransactionStatus from '../shared/TransactionStatus';
import LocationInput from '../shared/LocationInput';
import toast from 'react-hot-toast';

const CreateBatch = ({ actorLocation }) => {
  const [form, setForm] = useState({
    name: '', type: '', batchNumber: '', farmLocation: '',
    isOrganic: true, harvestDate: '', expiryDate: '', description: '',
  });
  const [docFile, setDocFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [productId, setProductId] = useState(null);
  const { getAgroChain } = useContract();
  const { upload, uploading } = useIPFS();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const autoGenBatch = () => {
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    set('batchNumber', `BATCH-${rand}-${new Date().getFullYear()}`);
  };

  const handleCreate = async () => {
    if (!form.name || !form.type || !form.batchNumber || !form.harvestDate || !form.expiryDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (new Date(form.expiryDate) <= new Date(form.harvestDate)) {
      toast.error('Expiry date must be after harvest date');
      return;
    }
    try {
      setLoading(true);
      setTxHash(null);
      setProductId(null);

      let description = form.description;
      if (docFile) {
        const id = toast.loading('Encrypting and uploading document to IPFS...');
        const cid = await upload(docFile);
        toast.dismiss(id);
        if (cid) {
          description = description ? `${description} | IPFS:${cid}` : `IPFS:${cid}`;
          toast.success('Document uploaded to IPFS');
        }
      }

      const contract = getAgroChain(true);
      const harvestTs = toUnixTimestamp(form.harvestDate);
      const expiryTs = toUnixTimestamp(form.expiryDate);
      const farmLoc = form.farmLocation || actorLocation || '';

      const toastId = toast.loading('Waiting for MetaMask confirmation...');
      const tx = await contract.registerProduct(
        form.name.trim(),
        form.type,
        form.batchNumber.trim(),
        farmLoc,
        form.isOrganic,
        harvestTs,
        expiryTs,
        description.trim(),
      );
      toast.loading('Recording product on blockchain...', { id: toastId });
      const receipt = await tx.wait();

      const event = receipt.events?.find(e => e.event === 'ProductRegistered');
      const id = event?.args?.productId?.toNumber();
      toast.success('Product registered successfully!', { id: toastId });
      setTxHash(receipt.transactionHash);
      if (id !== undefined) setProductId(id);
      setForm({ name: '', type: '', batchNumber: '', farmLocation: '', isOrganic: true, harvestDate: '', expiryDate: '', description: '' });
      setDocFile(null);
    } catch (err) {
      if (err.code === 4001) toast.error('Transaction rejected in MetaMask.');
      else if (err.message?.includes('batch number already registered')) toast.error('Batch number already exists. Use a unique batch number.');
      else toast.error('Product registration failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Register New Product</h2>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name <span className="text-red-500">*</span></label>
          <input type="text" placeholder="e.g. Organic Shea Butter"
            value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Type <span className="text-red-500">*</span></label>
          <select value={form.type} onChange={e => set('type', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
            <option value="">Select type</option>
            {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            <input type="text" placeholder="e.g. BATCH-A1B2C3-2025"
              value={form.batchNumber} onChange={e => set('batchNumber', e.target.value)}
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            <button onClick={autoGenBatch} type="button"
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm rounded-lg transition-colors whitespace-nowrap">
              Auto-generate
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Farm Location</label>
          <LocationInput
            placeholder={actorLocation || 'e.g. Minna, Niger State'}
            value={form.farmLocation}
            onChange={(val) => set('farmLocation', val)}
            className="w-full p-3 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Harvest Date <span className="text-red-500">*</span></label>
            <input type="date" value={form.harvestDate} onChange={e => set('harvestDate', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date <span className="text-red-500">*</span></label>
            <input type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)}
              min={form.harvestDate || new Date().toISOString().split('T')[0]}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
          <input type="checkbox" id="organic" checked={form.isOrganic}
            onChange={e => set('isOrganic', e.target.checked)}
            className="w-4 h-4 text-green-600 rounded" />
          <label htmlFor="organic" className="text-sm font-medium text-green-800">Mark as Organic Product</label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea placeholder="Additional notes about this product..."
            value={form.description} onChange={e => set('description', e.target.value)} rows={2}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Private Document <span className="text-gray-400 font-normal">(optional — encrypted on IPFS)</span>
          </label>
          <input type="file" accept=".pdf,.doc,.docx,.txt"
            onChange={e => setDocFile(e.target.files[0])}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-green-50 file:text-green-700" />
        </div>
        <button onClick={handleCreate} disabled={loading || uploading}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
          {loading || uploading
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{uploading ? 'Uploading...' : 'Registering...'}</>
            : 'Register Product'}
        </button>
      </div>
      {productId !== null && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs font-medium text-green-700 mb-1">Product ID (save this):</p>
          <p className="font-mono text-sm text-green-800">#{productId}</p>
        </div>
      )}
      <TransactionStatus txHash={txHash} />
    </div>
  );
};

export default CreateBatch;
