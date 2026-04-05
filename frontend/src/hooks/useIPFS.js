import { useState } from 'react';
import { uploadPrivateDocument, retrievePrivateDocument } from '../utils/ipfsUtils';

export const useIPFS = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const upload = async (file) => {
    setUploading(true);
    setUploadError(null);
    try {
      const cid = await uploadPrivateDocument(file);
      return cid;
    } catch (err) {
      setUploadError(err.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const retrieve = async (cid) => {
    try {
      return await retrievePrivateDocument(cid);
    } catch (err) {
      console.error('IPFS retrieve error:', err);
      return null;
    }
  };

  return { upload, retrieve, uploading, uploadError };
};
