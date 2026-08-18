"use client";

import { useEffect, useMemo, useRef } from "react";
import { resolveCoords } from "@/lib/geo";
import type { PropertyCard } from "@/lib/portfolio-types";

type Pin = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  price: string;
};

export function PropertyMap({
  properties,
  selectedId,
  onSelect,
}: {
  properties: PropertyCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{
    map: import("leaflet").Map;
    markers: Map<string, import("leaflet").Marker>;
    L: typeof import("leaflet");
  } | null>(null);

  const pins: Pin[] = useMemo(
    () =>
      properties
        .map((p) => {
          const re = p.asset.real_estate;
          if (!re) return null;
          const coords = resolveCoords(re.country, re.city, re.latitude, re.longitude);
          if (!coords) return null;
          const price = p.asset.current_value ?? p.asset.acquisition_cost;
          // Deterministic slight offset so same-city pins don't stack
          const hash = p.asset.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
          const jitterLat = ((hash % 17) - 8) * 0.002;
          const jitterLng = ((hash % 13) - 6) * 0.002;
          return {
            id: p.asset.id,
            lat: coords.lat + jitterLat,
            lng: coords.lng + jitterLng,
            label: p.asset.name,
            price:
              price != null
                ? new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: p.asset.currency,
                    maximumFractionDigits: 0,
                  }).format(price)
                : "—",
          };
        })
        .filter(Boolean) as Pin[],
    [properties],
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current || pins.length === 0) return;
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      if (cancelled || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.map.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
        [pins[0].lat, pins[0].lng],
        11,
      );
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      const markers = new Map<string, import("leaflet").Marker>();
      const bounds = L.latLngBounds([]);

      for (const pin of pins) {
        const marker = L.marker([pin.lat, pin.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:#22d3ee;color:#05070c;padding:4px 8px;border-radius:8px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 0 12px rgba(34,211,238,.45)">${pin.price}</div>`,
            iconSize: [80, 28],
            iconAnchor: [40, 14],
          }),
        })
          .addTo(map)
          .bindPopup(`<strong>${pin.label}</strong><br/>${pin.price}`);
        marker.on("click", () => onSelect(pin.id));
        markers.set(pin.id, marker);
        bounds.extend([pin.lat, pin.lng]);
      }

      if (pins.length > 1) map.fitBounds(bounds.pad(0.25));
      mapRef.current = { map, markers, L };
    }

    init();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.map.remove();
        mapRef.current = null;
      }
    };
  }, [pins, onSelect]);

  useEffect(() => {
    const ctx = mapRef.current;
    if (!ctx || !selectedId) return;
    const marker = ctx.markers.get(selectedId);
    if (marker) {
      marker.openPopup();
      ctx.map.panTo(marker.getLatLng());
    }
  }, [selectedId]);

  if (pins.length === 0) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-surface-border bg-black/40 text-sm text-gray-500">
        Choose a city with listings to open map view.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[360px] w-full overflow-hidden rounded-xl border border-surface-border"
    />
  );
}
