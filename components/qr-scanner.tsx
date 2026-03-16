"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";

type QRScannerProps = {
  onResult: (text: string) => void;
  /** Delay before starting the scanner (ms). Use when inside a modal so the container is visible and has size. */
  delayMs?: number;
};

type CameraPermission = "prompt" | "requesting" | "granted" | "denied" | "unsupported";

function requestCameraPermission(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return Promise.resolve(false);
  }
  return navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "environment" } })
    .then((stream) => {
      stream.getTracks().forEach((t) => t.stop());
      return true;
    })
    .catch(() => false);
}

export function QRScanner({ onResult, delayMs = 300 }: QRScannerProps) {
  const containerId = useRef(`qr-reader-${Math.random().toString(36).slice(2)}`);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onResultRef = useRef(onResult);
  const [permission, setPermission] = useState<CameraPermission>("prompt");

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPermission("unsupported");
    }
  }, []);
  const [error, setError] = useState<string | null>(null);
  onResultRef.current = onResult;

  const handleAllowCamera = useCallback(async () => {
    setPermission("requesting");
    setError(null);
    const granted = await requestCameraPermission();
    if (granted) {
      setPermission("granted");
    } else {
      setPermission("denied");
      setError("Camera access was denied. Allow camera in your browser or device settings and try again.");
    }
  }, []);

  useEffect(() => {
    if (permission !== "granted") return;
    const id = containerId.current;
    let cancelled = false;
    setError(null);

    const start = () => {
      if (cancelled) return;
      const scanner = new Html5Qrcode(id);
      scannerRef.current = scanner;
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (cancelled) return;
            setError(null);
            onResultRef.current(decodedText);
          },
          () => {},
        )
        .catch((e) => {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : "Failed to start camera");
          }
        });
    };

    const t = setTimeout(start, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(t);
      const s = scannerRef.current;
      scannerRef.current = null;
      s?.stop().catch(() => undefined).then(() => s?.clear());
    };
  }, [permission, delayMs]);

  const handleRestart = useCallback(async () => {
    if (permission !== "granted") return;
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) {
      await s.stop().catch(() => undefined);
      s.clear();
    }
    const id = containerId.current;
    const scanner = new Html5Qrcode(id);
    scannerRef.current = scanner;
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => onResultRef.current(decodedText),
      () => {},
    ).catch((e) => {
      setError(e instanceof Error ? e.message : "Failed to start camera");
    });
  }, [permission]);

  if (permission === "unsupported") {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
        <CameraOff className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Camera is not available. Use a device with a camera and a modern browser (Chrome, Firefox, Safari, Edge).
        </p>
        <p className="text-xs text-muted-foreground">
          Camera also requires a secure connection: use <strong>HTTPS</strong> or <strong>localhost</strong>.
        </p>
      </div>
    );
  }

  if (permission === "requesting") {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-6">
        <p className="text-sm text-muted-foreground">Requesting camera access…</p>
        <p className="text-xs text-muted-foreground">Allow when your browser prompts.</p>
      </div>
    );
  }

  if (permission === "prompt" || permission === "denied") {
    return (
      <div className="space-y-3">
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
          <Camera className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            {permission === "prompt" ? "Camera required for QR scanning" : "Camera access denied"}
          </p>
          <p className="text-sm text-muted-foreground">
            {permission === "prompt"
              ? "Allow camera access when your browser asks. The camera is only used to scan QR codes."
              : "Allow camera in your browser or device settings, then click Try again."}
          </p>
          {error && (
            <p className="text-xs text-amber-600 dark:text-amber-400">{error}</p>
          )}
          <Button
            type="button"
            onClick={handleAllowCamera}
          >
            {permission === "denied" ? "Try again" : "Allow camera"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        id={containerId.current}
        className="min-h-[280px] w-full"
        style={{ minHeight: 280 }}
      />
      {error && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          {error} Use HTTPS or localhost and allow camera access.
        </p>
      )}
      <Button
        type="button"
        size="xs"
        variant="outline"
        onClick={handleRestart}
      >
        Restart scanner
      </Button>
    </div>
  );
}

