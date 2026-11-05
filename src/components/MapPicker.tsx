"use client";

import "leaflet/dist/leaflet.css";

import L, { type LeafletEvent, type Marker as LeafletMarker } from "leaflet";
import { useEffect, useMemo } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import type { EscoamentoItem, LatLng } from "@/lib/types";

/** Pino principal selecionador (48px) — arrastável pelo usuário para registrar. */
const mainPinIcon = L.divIcon({
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

/** Marcador de ocorrência registrada: Água (azul com gota). */
const waterPinIcon = L.divIcon({
  className: "record-pin record-pin--water",
  html: `
    <div class="record-pin__body">
      <svg viewBox="0 0 38 46" width="38" height="46" aria-hidden="true">
        <path d="M19 2C9.5 2 2 9.5 2 19c0 13 17 25 17 25s17-12 17-25C36 9.5 28.5 2 19 2z"
              fill="#0284c7" stroke="#ffffff" stroke-width="2.5"/>
        <circle cx="19" cy="19" r="10" fill="#ffffff"/>
        <path d="M19 12s-4 4.2-4 7.2a4 4 0 0 0 8 0c0-3-4-7.2-4-7.2z" fill="#0284c7"/>
      </svg>
    </div>
    <div class="record-pin__shadow"></div>`,
  iconSize: [38, 46],
  iconAnchor: [19, 44],
  popupAnchor: [0, -40],
});

/** Marcador de ocorrência registrada: Esgoto (âmbar/marrom com tubulação). */
const sewagePinIcon = L.divIcon({
  className: "record-pin record-pin--sewage",
  html: `
    <div class="record-pin__body">
      <svg viewBox="0 0 38 46" width="38" height="46" aria-hidden="true">
        <path d="M19 2C9.5 2 2 9.5 2 19c0 13 17 25 17 25s17-12 17-25C36 9.5 28.5 2 19 2z"
              fill="#b45309" stroke="#ffffff" stroke-width="2.5"/>
        <circle cx="19" cy="19" r="10" fill="#ffffff"/>
        <path d="M14 15h5a2 2 0 0 1 2 2v6M14 18h3a1 1 0 0 1 1 1v4" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="record-pin__shadow"></div>`,
  iconSize: [38, 46],
  iconAnchor: [19, 44],
  popupAnchor: [0, -40],
});

interface MapPickerProps {
  /** Posição atual do marcador selecionador. */
  position: LatLng;
  /** Posição inicial obtida do GPS (centro do mapa na montagem). */
  initialCenter: LatLng;
  /** Última leitura do GPS, com precisão em metros (desenha o círculo de precisão). */
  userLocation?: (LatLng & { accuracy: number }) | null;
  /** Lista de registros já gravados com foto para exibir no mapa. */
  records?: EscoamentoItem[];
  /** Se deve mostrar o pino arrastável selecionador (modo registro). */
  showPickerPin?: boolean;
  /** Incrementado pelo pai para pedir que o mapa voe até `position`. */
  flyToken: number;
  onChange: (pos: LatLng) => void;
  /** Disparado ao clicar para ver a foto/detalhes completos de um registro existente. */
  onSelectRecord?: (record: EscoamentoItem) => void;
}

function FlyTo({ position, token }: { position: LatLng; token: number }) {
  const map = useMap();
  useEffect(() => {
    if (token === 0) return;
    map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 17), {
      duration: 0.6,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, map]);
  return null;
}

/** Botões de zoom grandes e táteis (essenciais para dedos molhados em canoas/barcos) */
function MobileZoomControls() {
  const map = useMap();
  return (
    <div className="absolute right-3.5 top-20 z-[1000] flex flex-col gap-2">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        aria-label="Aproximar mapa"
        className="glass grid h-12 w-12 place-items-center rounded-2xl text-slate-800 shadow-lg active:scale-90 font-bold text-2xl select-none"
      >
        +
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        aria-label="Afastar mapa"
        className="glass grid h-12 w-12 place-items-center rounded-2xl text-slate-800 shadow-lg active:scale-90 font-bold text-2xl select-none"
      >
        −
      </button>
    </div>
  );
}

/** Redimensiona o mapa caso o container mude de tamanho */
function InvalidateSizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

/** Toque no mapa move o pino selecionador (quando ativo) */
function TapToMove({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (pos: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function MapPicker({
  position,
  initialCenter,
  userLocation,
  records = [],
  showPickerPin = true,
  flyToken,
  onChange,
  onSelectRecord,
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
      zoom={16}
      maxZoom={19}
      zoomControl={false}
      className="h-full w-full"
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />

      <InvalidateSizeWatcher />
      <MobileZoomControls />

      {/* Círculo de precisão do GPS da canoa/barco */}
      {userLocation && userLocation.accuracy > 0 && (
        <Circle
          center={[userLocation.lat, userLocation.lng]}
          radius={userLocation.accuracy}
          pathOptions={{
            color: "#0e8aa6",
            fillColor: "#22b3cf",
            fillOpacity: 0.15,
            weight: 2,
          }}
        />
      )}

      {/* Marcadores dos locais já registrados no mapa com foto e descrição */}
      {records.map((rec) => {
        const isEsgoto = rec.tipo === "esgoto";
        const dataFormatada = new Date(rec.created_at).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <Marker
            key={rec.id}
            position={[rec.lat, rec.lng]}
            icon={isEsgoto ? sewagePinIcon : waterPinIcon}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e as unknown as Event);
                // No celular, abrir diretamente o bottom sheet de detalhes é a melhor experiência!
                onSelectRecord?.(rec);
              },
            }}
          >
            <Popup className="escoamento-popup" maxWidth={280} minWidth={230}>
              <div className="flex flex-col overflow-hidden rounded-xl bg-white text-slate-800">
                <div
                  className="group relative aspect-video w-full cursor-pointer overflow-hidden bg-slate-900"
                  onClick={() => onSelectRecord?.(rec)}
                  title="Toque para ver a foto"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={rec.foto_url}
                    alt={rec.ponto_referencia || `Escoamento de ${rec.tipo}`}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                  <span
                    className={`absolute bottom-2 left-2 rounded-md px-2 py-0.5 text-[11px] font-bold text-white shadow backdrop-blur-md ${
                      isEsgoto ? "bg-amber-600/90" : "bg-sky-600/90"
                    }`}
                  >
                    {isEsgoto ? "Esgoto" : "Água"}
                  </span>

                  <span className="absolute bottom-2 right-2 text-[10px] text-white/90 font-medium">
                    {dataFormatada}
                  </span>
                </div>

                <div className="p-3">
                  <p className="text-xs font-semibold text-slate-800 leading-snug">
                    {rec.ponto_referencia ? (
                      rec.ponto_referencia
                    ) : (
                      <span className="italic text-slate-400 font-normal">
                        Sem ponto de referência
                      </span>
                    )}
                  </p>

                  {rec.mau_cheiro && (
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-rose-600">
                      <span>⚠️ Mau cheiro relatado</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectRecord?.(rec)}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-sm active:scale-95"
                  >
                    Ver foto e detalhes
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Marcador selecionador arrastável (apenas no modo de registro) */}
      {showPickerPin && (
        <Marker
          draggable={true}
          position={[position.lat, position.lng]}
          icon={mainPinIcon}
          eventHandlers={eventHandlers}
          autoPan
        />
      )}

      <FlyTo position={position} token={flyToken} />
      <TapToMove enabled={showPickerPin} onChange={onChange} />
    </MapContainer>
  );
}
