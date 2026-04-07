import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useContract } from '../../hooks/useContract';
import { generateQRPayload } from '../../utils/qrUtils';
import TransactionStatus from '../shared/TransactionStatus';
import toast from 'react-hot-toast';

const GenerateQR = () => {
  const [batchHash, setBatchHash] = useState('');
  const [productName, setProductName] = useState('');
  const [qrPayload, setQrPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const { getAgroChain } = useContract();

  const handleList = async () => {
    if (!batchHash.trim()) { toast.error('Please enter the batch hash'); return; }
    try {
      setLoading(true); setTxHash(null); setQrPayload(null);
      const trace = getAgroChain(true);
      const toastId = toast.loading('Waiting for MetaMask confirmation...');
      const tx = await trace.listForSale(batchHash.trim());
      toast.loading('Listing product on blockchain...', { id: toastId });
      const receipt = await tx.wait();
      toast.success('Product listed! QR code generated.', { id: toastId });
      setTxHash(receipt.transactionHash);
      setQrPayload(generateQRPayload(batchHash.trim()));
    } catch (err) {
      if (err.code === 4001) toast.error('Transaction rejected in MetaMask.');
      else toast.error('Failed to list product. Please try again.');
      console.error(err);
    } finally { setLoading(false); }
  };

  const downloadQR = () => {
    const canvas = document.getElementById('product-qr');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${productName || 'product'}-QR.png`;
    link.href = url;
    link.click();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">List for Sale &amp; Generate QR</h2>
      <div className="space-y-3 mb-4">
        <input type="text" placeholder="Product name (for QR label)"
          value={productName} onChange={e => setProductName(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
        <input type="text" placeholder="Batch hash (0x...)"
          value={batchHash} onChange={e => setBatchHash(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm" />
        <button onClick={handleList} disabled={loading}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
          ) : 'List &amp; Generate QR'}
        </button>
      </div>

      {qrPayload && (
        <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
          <QRCodeCanvas
            id="product-qr"
            value={qrPayload}
            size={220}
            level="H"
            includeMargin={true}
          />
          <p className="mt-2 text-sm text-gray-700 font-medium">{productName || 'Product'}</p>
          <p className="text-xs text-gray-400 mb-3">Scan to verify authenticity on blockchain</p>
          <button onClick={downloadQR}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors">
            Download QR Label
          </button>
        </div>
      )}
      <TransactionStatus txHash={txHash} />
    </div>
  );
};

export default GenerateQR;
