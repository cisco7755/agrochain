import { etherscanTxUrl, shortenHash } from '../../utils/hashUtils';

const TransactionStatus = ({ txHash, status = 'confirmed' }) => {
  if (!txHash) return null;
  return (
    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
      <p className="text-xs text-green-700 font-medium mb-1">
        {status === 'confirmed' ? '✓ Transaction Confirmed' : '⏳ Transaction Submitted'}
      </p>
      <a
        href={etherscanTxUrl(txHash)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-green-600 underline break-all"
      >
        View on Etherscan: {shortenHash(txHash, 8)}
      </a>
    </div>
  );
};

export default TransactionStatus;
