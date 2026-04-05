import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, CameraOff } from 'lucide-react';

const QRScanner = ({ onScan }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const animRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
        scanFrame();
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions and try again.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setScanning(false);
  };

  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
    if (code) {
      stopCamera();
      onScan(code.data);
      return;
    }
    animRef.current = requestAnimationFrame(scanFrame);
  };

  useEffect(() => () => stopCamera(), []);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Scan QR Code</h2>
      <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ minHeight: 240 }}>
        <video ref={videoRef} className="w-full" playsInline muted style={{ display: scanning ? 'block' : 'none' }} />
        <canvas ref={canvasRef} className="hidden" />
        {!scanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <CameraOff className="w-12 h-12 text-gray-500" />
          </div>
        )}
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-green-400 rounded-lg opacity-70" />
          </div>
        )}
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <button
        onClick={scanning ? stopCamera : startCamera}
        className={`w-full py-3 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
          scanning
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
        <Camera className="w-5 h-5" />
        {scanning ? 'Stop Scanning' : 'Start Scanning'}
      </button>
      {scanning && (
        <p className="text-center text-xs text-gray-500 mt-2">Point your camera at the product QR code</p>
      )}
    </div>
  );
};

export default QRScanner;
