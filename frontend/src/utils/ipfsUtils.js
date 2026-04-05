import { encryptFile, decryptFile } from './encryption';

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY || '';
const PINATA_SECRET = import.meta.env.VITE_PINATA_SECRET_KEY || '';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

export const uploadPrivateDocument = async (file) => {
  try {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async (e) => {
        const encrypted = encryptFile(e.target.result);
        const blob = new Blob([encrypted], { type: 'text/plain' });
        const formData = new FormData();
        formData.append('file', new File([blob], file.name + '.enc'));

        const metadata = JSON.stringify({ name: file.name + '.enc' });
        formData.append('pinataMetadata', metadata);

        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
          method: 'POST',
          headers: {
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_SECRET,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Pinata upload failed: ${response.statusText}`);
        }

        const data = await response.json();
        resolve(data.IpfsHash);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  } catch (err) {
    throw new Error('IPFS upload failed: ' + err.message);
  }
};

export const retrievePrivateDocument = async (cid) => {
  try {
    const response = await fetch(`${PINATA_GATEWAY}/${cid}`);
    if (!response.ok) throw new Error('Failed to retrieve from IPFS');
    const encrypted = await response.text();
    return decryptFile(encrypted);
  } catch (err) {
    throw new Error('IPFS retrieval failed: ' + err.message);
  }
};

export const getIPFSUrl = (cid) => {
  if (!cid) return null;
  return `${PINATA_GATEWAY}/${cid}`;
};
