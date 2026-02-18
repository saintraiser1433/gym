"use client";

import * as React from "react";
import { QRDisplay } from "@/components/qr-display";

type QrResponse = {
  image: string;
};

export default function ClientCheckinPage() {
  const [qr, setQr] = React.useState<string | null>(null);

  const loadQr = React.useCallback(async () => {
    const res = await fetch("/api/client/attendance/qr");
    if (res.ok) {
      const json: QrResponse = await res.json();
      setQr(json.image);
    }
  }, []);

  React.useEffect(() => {
    void loadQr();
  }, [loadQr]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">QR Check-in</h1>
        <p className="text-sm text-muted-foreground">
          Show this QR code at the gym entrance to check in.
        </p>
      </div>
      <QRDisplay src={qr} />
    </div>
  );
}

