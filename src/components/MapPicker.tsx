"use client";

import "leaflet/dist/leaflet.css";

import L, { type LeafletEvent, type Marker as LeafletMarker } from "leaflet";
import { useEffect, useMemo } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import type { LatLng } from "@/lib/types";

/** Pino grande (48px) — mais fácil de agarrar com o dedo do que o ícone padrão. */
const pinIcon = L.divIcon({
  className: "pin-icon",
  html: `
    <div class="pin-icon__body">
      <svg viewBox="0 0 48 56" width="48" height="56" aria-hidden="true">
        <path d="M24 2C12.4 2 3 11.2 3 22.6 3 37.8 24 54 24 54s21-16.2 21-31.4C45 11.2 35.6 2 24 2z"
              fill="#0b6e86" stroke="#fff" stroke-width="3"/>
        <circle cx="24" cy="22" r="8" fill="#fff"/>
      </svg>
    </div>
    <div class="pin-icon__shadow"></div>`,
  iconSize: [48, 56],
  iconAnchor: [24, 54],
});

interface MapPickerProps {
  /** Posição atual do marcador. */
  position: LatLng;
  /** Posição inicial obtida do GPS (centro do mapa na montagem). */
  initialCenter: LatLng;
  /** Última leitura do GPS, com precisão em metros (desenha o círculo de precisão). */
  userLocation?: (LatLng & { accuracy: number }) | null;
  /** Incrementado pelo pai para pedir que o mapa voe até `position`. */
  flyToken: number;
  onChange: (pos: LatLng) => void;
}

function FlyTo({ position, token }: { position: LatLng; token: number }) {
  const map = useMap();
  useEffect(() => {
    if (token === 0) return;
    map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 18), {
      duration: 0.6,
    });
    // Só reage ao token — não deve voar a cada arraste do pino.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, map]);
  return null;
}

/** Toque no mapa também move o pino (ajuda quando o pino está fora da área visível). */
function TapToMove({ onChange }: { onChange: (pos: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function MapPicker({
  position,
  initialCenter,
  userLocation,
  flyToken,
  onChange,
}: MapPickerProps) {
  const eventHandlers = useMemo(
    () => ({
      dragend(e: LeafletEvent) {
        const { lat, lng } = (e.target as LeafletMarker).getLatLng();
        onChange({ lat, lng });
      },
    }),
    [onChange],
  );

  return (
    <MapContainer
      center={[initialCenter.lat, initialCenter.lng]}
      zoom={18}
      maxZoom={19}
      zoomControl={false}
      className="h-full w-full"
      attributionControl
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />

      {userLocation && userLocation.accuracy > 0 && (
        <Circle
          center={[userLocation.lat, userLocation.lng]}
          radius={userLocation.accuracy}
          pathOptions={{
            color: "#0e8aa6",
            fillColor: "#22b3cf",
            fillOpacity: 0.12,
            weight: 1,
          }}
        />
      )}

      <Marker
        draggable={true}
        position={[position.lat, position.lng]}
        icon={pinIcon}
        eventHandlers={eventHandlers}
        autoPan
      />

      <FlyTo position={position} token={flyToken} />
      <TapToMove onChange={onChange} />
    </MapContainer>
  );
}
