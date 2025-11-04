import JsBarcode from 'jsbarcode'
import { useEffect, useRef } from 'react'

interface BarcodeDisplayProps {
  code: string;
}

const BarcodeDisplay: React.FC<BarcodeDisplayProps> = ({ code }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && code) {
      JsBarcode(canvasRef.current, code, {
        format: 'CODE128',
        width: 2,
        height: 40,
        displayValue: false,
        margin: 5,
      });
    }
  }, [code]);

  return <canvas ref={canvasRef} className="barcode-canvas" />;
};

export default BarcodeDisplay;