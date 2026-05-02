"use client";

import * as React from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: L.LatLngTuple = [14.5995, 120.9842];
const DEFAULT_ZOOM = 13;

function useLeafletIconFix() {
  React.useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });
  }, []);
}

function MapClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Runs setView only after the map instance has a valid container (avoids appendChild races). */
function Recenter({ center, zoom }: { center: L.LatLngTuple; zoom: number }) {
  const map = useMap();
  React.useEffect(() => {
    map.whenReady(() => {
      map.setView(center, zoom);
    });
  }, [map, center, zoom]);
  return null;
}

export type AddressMapPickerProps = {
  address: string;
  onAddressChange: (address: string) => void;
  /** When true, map and address are view-only (no geolocation, clicks, or edits). */
  readOnly?: boolean;
  /** Hide the small label above the textarea (use an outer label instead). */
  hideTextareaLabel?: boolean;
};

export function AddressMapPicker({
  address,
  onAddressChange,
  readOnly = false,
  hideTextareaLabel = false,
}: AddressMapPickerProps) {
  useLeafletIconFix();
  const [position, setPosition] = React.useState<L.LatLngTuple | null>(null);
  const [loadingGeo, setLoadingGeo] = React.useState(false);
  const [loadingReverse, setLoadingReverse] = React.useState(false);
  const [geoError, setGeoError] = React.useState<string | null>(null);
  /** Leaflet needs a real DOM container; defer past SSR + React Strict Mode first paint. */
  const [mapReady, setMapReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setMapReady(true);
      });
    });
    return () => {
      cancelled = true;
      setMapReady(false);
    };
  }, []);

  const reverseGeocode = React.useCallback(
    async (lat: number, lng: number) => {
      if (readOnly) return;
      setLoadingReverse(true);
      setGeoError(null);
      try {
        const res = await fetch(
          `/api/geocode/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`,
          { cache: "no-store" },
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setGeoError(typeof json.error === "string" ? json.error : "Could not resolve address");
          return;
        }
        const line = typeof json.displayName === "string" ? json.displayName : "";
        if (line) onAddressChange(line);
      } finally {
        setLoadingReverse(false);
      }
    },
    [onAddressChange, readOnly],
  );

  const handlePick = React.useCallback(
    (lat: number, lng: number) => {
      if (readOnly) return;
      setPosition([lat, lng]);
      void reverseGeocode(lat, lng);
    },
    [readOnly, reverseGeocode],
  );

  const handleLocate = React.useCallback(() => {
    if (readOnly) return;
    if (!navigator.geolocation) {
      setGeoError("Location is not supported in this browser.");
      return;
    }
    setLoadingGeo(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLoadingGeo(false);
        setPosition([latitude, longitude]);
        void reverseGeocode(latitude, longitude);
      },
      () => {
        setLoadingGeo(false);
        setGeoError("Could not read your location. Allow location access or tap the map.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }, [readOnly, reverseGeocode]);

  const center = position ?? DEFAULT_CENTER;
  const zoom = position ? 16 : DEFAULT_ZOOM;

  const mapInteractionProps = readOnly
    ? {
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomControl: true,
      }
    : { scrollWheelZoom: true as const };

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="h-7 text-[11px]"
            disabled={loadingGeo || loadingReverse}
            onClick={() => handleLocate()}
          >
            {loadingGeo ? "Locating…" : "Use my location"}
          </Button>
          <span className="text-[10px] text-muted-foreground">
            Or click the map to drop a pin. Address fills automatically.
          </span>
        </div>
      )}
      {readOnly && (
        <p className="text-[10px] text-muted-foreground">
          Map is read-only (address comes from the client&apos;s registration).
        </p>
      )}
      {(loadingReverse || geoError) && !readOnly && (
        <p className={`text-[10px] ${geoError ? "text-destructive" : "text-muted-foreground"}`}>
          {loadingReverse ? "Resolving address…" : geoError}
        </p>
      )}
      <div className="relative isolate min-h-[220px] w-full overflow-hidden rounded-md border bg-muted/30">
        {!mapReady ? (
          <div className="flex h-[220px] w-full items-center justify-center text-[11px] text-muted-foreground">
            Loading map…
          </div>
        ) : (
          <MapContainer
            center={center}
            zoom={zoom}
            className="relative z-0 h-[220px] w-full [&_.leaflet-container]:z-0"
            {...mapInteractionProps}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Recenter center={center} zoom={zoom} />
            {!readOnly && <MapClickHandler onPick={handlePick} />}
            {!readOnly && position && (
              <Marker
                position={position}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const m = e.target;
                    const { lat, lng } = m.getLatLng();
                    setPosition([lat, lng]);
                    void reverseGeocode(lat, lng);
                  },
                }}
              />
            )}
          </MapContainer>
        )}
      </div>
      <div className="space-y-1">
        {!hideTextareaLabel && (
          <label className="text-[10px] font-medium text-muted-foreground">
            {readOnly ? "Address (from registration)" : "Address (editable)"}
          </label>
        )}
        <textarea
          className={cn(
            "flex min-h-[56px] w-full rounded-md border border-input px-2 py-1.5 text-[11px] shadow-xs outline-none",
            readOnly ? "cursor-default bg-muted/50 text-muted-foreground" : "bg-transparent",
          )}
          placeholder={readOnly ? "" : "Filled from map or type manually"}
          value={address}
          readOnly={readOnly}
          aria-readonly={readOnly}
          aria-label={hideTextareaLabel ? "Address" : undefined}
          onChange={(e) => !readOnly && onAddressChange(e.target.value)}
        />
      </div>
    </div>
  );
}
