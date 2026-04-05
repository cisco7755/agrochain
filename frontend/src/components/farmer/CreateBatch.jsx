import { useState } from 'react';
import { useContract } from '../../hooks/useContract';
import { useIPFS } from '../../hooks/useIPFS';
import { PRODUCT_CATEGORIES } from '../../config/constants';
import { toUnixTimestamp } from '../../utils/hashUtils';
import TransactionStatus from '../shared/TransactionStatus';
import toast from 'react-hot-toast';

const CreateBatch = ({ farmId }) => {
  const [form, setForm] = useState({
    product: '', category: '', date: '', lotNumber: '',
  });
  const [docFile, setDocFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [batchHash, setBatchHash] = useState(null);
  const { getProductTrace } = useContract();
  const { upload, uploading } = useIPFS();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!farmId) { toast.error('No farm registered. Please register your farm first.'); return; }
    if (!form.product || !form.category || !form.date) {
      toast.error('Please fill in product name, category, and date');
      return;
    }
    try {
      setLoading(true);
      setTxHash(null);
      setBatchHash(null);

      let cid = '';
      if (docFile) {
        const toastId = toast.loading('Encrypting and uploading document to IPFS...');
        cid = await upload(docFile);
        toast.dismiss(toastId);
        if (!cid) { toast.error('Document upload failed. Proceeding without document.'); }
        else toast.success('Document uploaded to IPFS');
      }

      const trace = getProductTrace(true);
      const harvestTimestamp = toUnixTimestamp(form.date);
      const toastId = toast.loading('Waiting for MetaMask confirmation...');
      const tx = await trace.createBatch(
        farmId, form.product.trim(), form.category, harvestTimestamp, cid
      );
      toast.loading('Recording batch on blockchain...', { id: toastId });
      const receipt = await tx.wait();

      const event = receipt.events?.find(e => e.event === 'BatchCreated');
      const hash = event?.args?.batchHash;
      toast.success('Batch created successfully!', { id: toastId });
      setTxHash(receipt.transactionHash);
      if (hash) setBatchHash(hash);
      setForm({ product: '', category: '', date: '', lotNumber: '' });
      setDocFile(null);
    } catch (err) {
      if (err.code === 4001) toast.error('Transaction rejected in MetaMask.');
      else toast.error('Batch creation failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Create Product Batch</h2>
      {!farmId && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          You must register your farm before creating batches.
        </div>
      )}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
          <input type="text" placeholder="e.g. Organic Shea Butter, Tomatoes"
            value={form.product} onChange={e => set('product', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
            <option value="">Select category</option>
            {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Harvest / Production Date</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Private Document <span className="text-gray-400 font-normal">(optional — lab report, soil cert)</span>
          </label>
          <input type="file" accept=".pdf,.doc,.docx,.txt"
            onChange={e => setDocFile(e.target.files[0])}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-green-50 file:text-green-700" />
          {docFile && <p className="text-xs text-gray-500 mt-1">Will be encrypted and stored on IPFS</p>}
        </div>
        <button onClick={handleCreate} disabled={loading || uploading || !farmId}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
          {loading || uploading ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {uploading ? 'Uploading document...' : 'Creating batch...'}</>
          ) : 'Create Batch'}
        </button>
      </div>
      {batchHash && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs font-medium text-green-700 mb-1">Batch Hash (save this for QR generation):</p>
          <p className="font-mono text-xs text-green-800 break-all">{batchHash}</p>
        </div>
      )}
      <TransactionStatus txHash={txHash} />
    </div>
  );
};

export default CreateBatch;
