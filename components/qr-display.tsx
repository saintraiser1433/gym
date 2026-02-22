"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Maximize2, Download } from "lucide-react";

type QRDisplayProps = {
  src: string | null;
};

const DEFAULT_FILENAME = "my-qr-code.png";

export function QRDisplay({ src }: QRDisplayProps) {
  const [fullscreenOpen, setFullscreenOpen] = React.useState(false);

  const handleDownload = React.useCallback(() => {
    if (!src) return;
    const link = document.createElement("a");
    link.href = src;
    link.download = DEFAULT_FILENAME;
    link.click();
  }, [src]);

  if (!src) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
        QR code not available.
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex h-40 items-center justify-center rounded-md border bg-card p-2">
          <img
            src={src}
            alt="Attendance QR"
            className="h-full w-auto"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setFullscreenOpen(true)}
          >
            <Maximize2 className="h-4 w-4" />
            Fullscreen
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      {fullscreenOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="QR code fullscreen"
        >
          <img
            src={src}
            alt="Attendance QR"
            className="max-h-[85vh] max-w-full w-auto object-contain"
          />
          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={() => setFullscreenOpen(false)}
          >
            Close
          </Button>
        </div>
      )}
    </>
  );
}

