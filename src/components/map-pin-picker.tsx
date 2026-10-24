import * as React from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CircleCheck, MapPin as MapPinIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MapPin } from "@/lib/filters";
import { cn } from "cn";

/** Chulalongkorn University area — where the map opens when nothing is chosen yet. */
export const DEFAULT_MAP_CENTER: MapPin = { lat: 13.738, lng: 100.532 };

const PIN_ICON = L.divIcon({
  className: "connex-map-pin",
  html: '<span style="display:flex;width:32px;height:32px;color:var(--primary);filter:drop-shadow(0 1px 2px rgb(0 0 0 / 0.35))"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-.601.2c-.562 0-.924-.324-1.377-.723C8.877 19.766 4 15.09 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="#fff" stroke="none"/></svg></span>',
  iconSize: [32, 32],
  iconAnchor: [16, 30],
});

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function addOsmTiles(map: L.Map) {
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: OSM_ATTRIBUTION,
  }).addTo(map);
}

function placeMarker(map: L.Map, pin: MapPin, interactive: boolean): L.Marker {
  return L.marker([pin.lat, pin.lng], { icon: PIN_ICON, keyboard: false, interactive }).addTo(map);
}

/** Matches two centers so programmatic moves (preset changes) don't count as pinning. */
function sameCenter(a: MapPin, b: MapPin): boolean {
  return Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lng - b.lng) < 1e-7;
}

export function MapPinPicker({
  value,
  onChange,
  center = DEFAULT_MAP_CENTER,
}: {
  value: MapPin | null;
  onChange: (pin: MapPin | null) => void;
  center?: MapPin;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const onChangeRef = React.useRef(onChange);
  const valueRef = React.useRef(value);
  const centerRef = React.useRef(center);
  const lastSetRef = React.useRef<MapPin | null>(null);

  React.useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
    centerRef.current = center;
  });

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const start = valueRef.current ?? centerRef.current;
    lastSetRef.current = start;
    const map = L.map(el, {
      center: [start.lat, start.lng],
      zoom: 16,
      scrollWheelZoom: false,
      keyboard: false,
    });
    addOsmTiles(map);
    map.on("moveend", () => {
      const programmatic = lastSetRef.current;
      const now = map.getCenter();
      const current = { lat: now.lat, lng: now.lng };
      if (programmatic && sameCenter(programmatic, current)) {
        lastSetRef.current = null;
        return;
      }
      lastSetRef.current = null;
      onChangeRef.current(current);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || valueRef.current) return;
    lastSetRef.current = center;
    map.setView([center.lat, center.lng], map.getZoom());
  }, [center]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const deltas: Record<string, [number, number]> = {
      ArrowUp: [0, -24],
      ArrowDown: [0, 24],
      ArrowLeft: [-24, 0],
      ArrowRight: [24, 0],
    };
    const delta = deltas[event.key];
    const map = mapRef.current;
    if (!delta || !map) return;
    event.preventDefault();
    map.panBy(delta, { animate: false });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative isolate h-56 w-full overflow-hidden rounded-xl border border-border sm:h-64">
        <div
          ref={containerRef}
          role="group"
          aria-label="Map picker — drag the map so the pin in the center points at the meeting spot, or focus the map and use the arrow keys"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="absolute inset-0 outline-none focus-visible:inset-ring-3 focus-visible:inset-ring-ring/50"
        />
        <div className="pointer-events-none absolute inset-0 z-[600]">
          <MapPinIcon
            aria-hidden="true"
            className={cn(
              "absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-full drop-shadow-md transition-colors",
              value
                ? "fill-primary stroke-background text-primary"
                : "fill-muted-foreground/70 stroke-background text-muted-foreground/70",
            )}
          />
        </div>
      </div>
      {value ? (
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
            Pin set at {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </span>
          <Button type="button" variant="ghost" size="xs" onClick={() => onChange(null)}>
            <X data-icon="inline-start" aria-hidden="true" />
            Clear pin
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Drag the map so the pin in the middle sits on the exact meeting spot.
        </p>
      )}
    </div>
  );
}

export function MapPinPreview({
  pin,
  className,
}: {
  pin: MapPin;
  className?: string;
}) {
  const { lat, lng } = pin;
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const map = L.map(el, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      scrollWheelZoom: false,
      boxZoom: false,
      keyboard: false,
    });
    addOsmTiles(map);
    placeMarker(map, { lat, lng }, false);
    return () => {
      map.remove();
    };
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`Map showing the pinned meeting spot at ${lat.toFixed(5)}, ${lng.toFixed(5)}`}
      className={cn("isolate h-40 w-full overflow-hidden rounded-xl border border-border", className)}
    />
  );
}
