import { useState } from 'react';
import { useContract } from '../../hooks/useContract';
import { useIPFS } from '../../hooks/useIPFS';
import TransactionStatus from '../shared/TransactionStatus';
import toast from 'react-hot-toast';

const IssueCertification = ({ batchHash, batchData, onDone }) => {
  const [certId, setCertId] = useState('');
  const [notes, setNotes] = useState('');
  const [certDoc, setCertDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');
  const [txHash, setTxHash] = useState(null);
  const { getProductTrace } = useContract();
  const { upload, uploading } = useIPFS();

  const handleCertify = async () => {
    if (!certId.trim()) { toast.error('Please enter a certification ID'); return; }
    try {
      setLoading(true); setTxHash(null);
      let cid = '';
      if (certDoc) {
        const id = toast.loading('Uploading certification document to IPFS...');
        cid = await upload(certDoc);
        toast.dismiss(id);
        if (cid) toast.success('Document uploaded');
      }
      const trace = getProductTrace(true);
      const toastId = toast.loading('Waiting for MetaMask confirmation...');
      const tx = await trace.certifyBatch(batchHash, certId.trim(), cid || '');
      toast.loading('Recording certification on blockchain...', { id: toastId });
      const receipt = await tx.wait();
      toast.success('Batch certified successfully!', { id: toastId });
      setTxHash(receipt.transactionHash);
      if (onDone) onDone();
    } catch (err) {
      if (err.code === 4001) toast.error('Transaction rejected in MetaMask.');
      else toast.error('Certification failed. Please try again.');
      console.error(err);
    } finally { setLoading(false); }
  };

  const handleReject = async () => {
    if (!reason.trim()) { toast.error('Please provide a rejection reason'); return; }
    try {
      setLoading(true); setTxHash(null);
      const trace = getProductTrace(true);
      const toastId = toast.loading('Waiting for MetaMask confirmation...');
      const tx = await trace.rejectBatch(batchHash, reason.trim());
      toast.loading('Recording rejection on blockchain...', { id: toastId });
      const receipt = await tx.wait();
      toast.success('Batch rejected and recorded on blockchain.', { id: toastId });
      setTxHash(receipt.transactionHash);
      if (onDone) onDone();
    } catch (err) {
      if (err.code === 4001) toast.error('Transaction rejected in MetaMask.');
      else toast.error('Rejection failed. Please try again.');
      console.error(err);
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <h2 className="text-xl font-bold mb-2 text-gray-800">Issue Certification</h2>
      {batchData && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-semibold text-green-800">{batchData.productName}</p>
          <p className="text-xs text-green-600">{batchData.farmName} · {batchData.farmLocation}</p>
          <p className="font-mono text-xs text-green-700 mt-1 break-all">{batchHash}</p>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button onClick={() => setRejectMode(false)}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${!rejectMode ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          Certify
        </button>
        <button onClick={() => setRejectMode(true)}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${rejectMode ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          Reject
        </button>
      </div>

      {!rejectMode ? (
        <div className="space-y-3">
          <input type="text" placeholder="Certification ID (e.g. NAFDAC-2025-001)"
            value={certId} onChange={e => setCertId(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
          <textarea placeholder="Inspection notes (optional)"
            value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Certification Document <span className="text-gray-400 font-normal">(optional, stored encrypted on IPFS)</span>
            </label>
            <input type="file" accept=".pdf,.doc,.docx"
              onChange={e => setCertDoc(e.target.files[0])}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-green-50 file:text-green-700" />
          </div>
          <button onClick={handleCertify} disabled={loading || uploading}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {loading || uploading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
            ) : 'Issue Certification'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea placeholder="Reason for rejection (e.g. Failed pesticide residue test)"
            value={reason} onChange={e => setReason(e.target.value)} rows={4}
            className="w-full p-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm" />
          <button onClick={handleReject} disabled={loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Rejecting...</>
            ) : 'Reject Batch'}
          </button>
        </div>
      )}
      <TransactionStatus txHash={txHash} />
    </div>
  );
};

export default IssueCertification;
