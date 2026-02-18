"use client";

import { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Button } from "@/components/ui/button";

type QRScannerProps = {
  onResult: (text: string) => void;
};

export function QRScanner({ onResult }: QRScannerProps) {
  const containerId = useRef(`qr-reader-${Math.random().toString(36).slice(2)}`);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const id = containerId.current;
    const scanner = new Html5QrcodeScanner(id, {
      fps: 10,
      qrbox: 250,
    });

    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        onResult(decodedText);
      },
      () => {
        // ignore errors
      },
    );

    return () => {
      scanner.clear().catch(() => undefined);
    };
  }, [onResult]);

  return (
    <div className="space-y-2">
      <div id={containerId.current} />
      <Button
        type="button"
        size="xs"
        variant="outline"
        onClick={() => {
          // restart scan by clearing and re-rendering
          scannerRef.current?.clear().then(() => {
            scannerRef.current?.render(
              (decodedText) => {
                onResult(decodedText);
              },
              () => undefined,
            );
          });
        }}
      >
        Restart scanner
      </Button>
    </div>
  );
}

