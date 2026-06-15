import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './BarcodeScanner.scss'
interface BarcodeScannerProps {
  onScan: (result: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan }) => {
  const { t } = useTranslation();
  const scannerRef = useRef<HTMLDivElement>(null);
  const scannerInstanceRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [scanKey, setScanKey] = useState(0);

  useEffect(() => {
    if (!scannerRef.current) return;

    // Создаём сканер с конфигом
    const scanner = new Html5QrcodeScanner(
      'scanner-container',  // ID контейнера
      {
        fps: 10,  // Кадры в секунду
        qrbox: { width: 250, height: 250 },  // Область сканирования
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,  // Для твоих баркодов
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
      },
      false  // Не показывать UI кнопки (мы сами)
    );

    scannerInstanceRef.current = scanner;

    // Callback на скан
    scanner.render(
      (decodedText: string, _decodedResult: any) => {
        onScan(decodedText);
        setIsScanning(false);
        scanner.clear();  // Остановка после скана
      },
      (error: any) => {
        if (error && error !== 'No MultiFormat Readers were able to detect the code.') {
          setError(t('scanner.scanError', { message: error }));
          console.error(error);
        }
      }
    );

    setIsScanning(true);

    // Очистка
    return () => {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear();
      }
    };
  }, [onScan, scanKey]);

  const restartScan = () => {
    setError(null);
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.clear().then(() => {
        setScanKey(prev => prev + 1);
        setIsScanning(true);
      }).catch(err => {
        console.error("Failed to clear scanner", err);
        setScanKey(prev => prev + 1);
        setIsScanning(true);
      });
    } else {
      setScanKey(prev => prev + 1);
      setIsScanning(true);
    }
  };

  return (
    <div className="barcode-scanner" key={scanKey}>
      {error && <div className="error">{error}</div>}
      <div
        id="scanner-container"
        ref={scannerRef}
        className="scanner-container"
        style={{ display: isScanning ? 'block' : 'none' }}
      />
      {!isScanning && (
        <div className="scan-complete">
          <p>{t('scanner.scanComplete')}</p>
          <button onClick={restartScan}>{t('scanner.scanAgain')}</button>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;