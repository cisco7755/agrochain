import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'agrochain_secure_key_32chars____';

export const encryptFile = (fileContent) => {
  return CryptoJS.AES.encrypt(fileContent, ENCRYPTION_KEY).toString();
};

export const decryptFile = (encryptedContent) => {
  const bytes = CryptoJS.AES.decrypt(encryptedContent, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

export const encryptText = (text) => {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

export const decryptText = (encrypted) => {
  const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};
