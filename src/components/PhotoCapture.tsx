"use client";

import { useRef } from "react";
import { CameraIcon, RefreshIcon, XIcon } from "./icons";

interface PhotoCaptureProps {
  previewUrl: string | null;
  processing?: boolean;
  onCapture: (file: File) => void;
  onClear: () => void;
}

export default function PhotoCapture({
  previewUrl,
  processing,
  onCapture,
  onClear,
}: PhotoCaptureProps) {
  // Input para abrir a câmera traseira diretamente
  const cameraInputRef = useRef<HTMLInputElement>(null);
  // Input para escolher foto salva na galeria
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const abrirCamera = () => cameraInputRef.current?.click();
  const abrirGaleria = () => galleryInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onCapture(file);
    e.target.value = "";
  };

  return (
    <div>
      {/* Input nativo que abre a câmera traseira do celular */}
      <input
        ref={cameraInputRef}
        id="foto-camera-input"
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={handleFileChange}
      />

      {/* Input nativo para escolher da biblioteca de fotos */}
      <input
        ref={galleryInputRef}
        id="foto-galeria-input"
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={handleFileChange}
      />

      {previewUrl ? (
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 border border-slate-200/80">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl ring-2 ring-brand-500/40 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Pré-visualização da foto capturada"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              id="remover-foto-btn"
              onClick={onClear}
              aria-label="Remover foto"
              className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-slate-950/75 text-white backdrop-blur active:scale-90 transition"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              ✓ Foto carregada
            </span>
            <p className="mt-1 text-xs text-slate-500 line-clamp-2">
              Toque abaixo para tirar outra foto ou trocar pela galeria.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                id="refazer-foto-btn"
                onClick={abrirCamera}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-brand-700 border border-slate-200 shadow-sm active:scale-95 transition"
              >
                <RefreshIcon className="h-3.5 w-3.5" />
                Câmera
              </button>
              <button
                type="button"
                onClick={abrirGaleria}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 shadow-sm active:scale-95 transition"
              >
                Galeria
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {/* Botão principal gigante para câmera (ideal para mão molhada no barco) */}
          <button
            type="button"
            id="tirar-foto-btn"
            onClick={abrirCamera}
            disabled={processing}
            className="group flex w-full min-h-24 items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-brand-400 bg-brand-50/80 px-4 py-4 text-brand-800 transition hover:border-brand-600 hover:bg-brand-100/70 active:scale-[0.98] disabled:opacity-60 shadow-sm"
          >
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition group-active:scale-95">
              <CameraIcon className="h-7 w-7" />
            </span>
            <div className="text-left">
              <span className="block text-base font-bold text-slate-900 leading-tight">
                {processing ? "Processando imagem…" : "Tirar foto agora"}
              </span>
              <span className="block text-xs font-medium text-brand-700 mt-0.5">
                Abre a câmera traseira do celular
              </span>
            </div>
          </button>

          {/* Opção secundária para quem já tem a foto na galeria */}
          <button
            type="button"
            onClick={abrirGaleria}
            disabled={processing}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 active:scale-[0.98] transition"
          >
            <span>📁 Escolher foto já salva na galeria</span>
          </button>
        </div>
      )}
    </div>
  );
}
