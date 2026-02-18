"use client";

type QRDisplayProps = {
  src: string | null;
};

export function QRDisplay({ src }: QRDisplayProps) {
  if (!src) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
        QR code not available.
      </div>
    );
  }

  return (
    <div className="flex h-40 items-center justify-center rounded-md border bg-card p-2">
      <img
        src={src}
        alt="Attendance QR"
        className="h-full w-auto"
      />
    </div>
  );
}

