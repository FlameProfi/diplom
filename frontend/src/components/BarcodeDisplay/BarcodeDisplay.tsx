import JsBarcode from 'jsbarcode'
import { useEffect, useRef } from 'react'

interface BarcodeDisplayProps {
  code: string;
  displayValue?: boolean;
}

const BarcodeDisplay: React.FC<BarcodeDisplayProps> = ({ code, displayValue = false }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && code) {
      JsBarcode(svgRef.current, code, {
        format: 'CODE128',
        width: 2,
        height: 40,
        displayValue: displayValue,
        margin: 5,
      });
    }
  }, [code, displayValue]);

  return <svg ref={svgRef} className="barcode-canvas" />;
};

export default BarcodeDisplay;
