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
  const inputRef = useRef<HTMLInputElement>(null);

  const abrirCamera = () => inputRef.current?.click();

  return (
    <div>
      {/* Input nativo oculto — abre a câmera traseira no celular. */}
      <input
        ref={inputRef}
        id="foto-input"
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onCapture(file);
          // Permite selecionar a mesma foto novamente.
          e.target.value = "";
        }}
      />

      {previewUrl ? (
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl ring-2 ring-brand-500/30 animate-pop">
            {/* Blob URL local: next/image não se aplica aqui. */}
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
              className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur active:scale-90 transition"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Foto anexada</p>
            <p className="text-xs text-slate-500">
              Confira se o cano ou escoamento está visível.
            </p>
            <button
              type="button"
              id="refazer-foto-btn"
              onClick={abrirCamera}
              className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 active:scale-95 transition"
            >
              <RefreshIcon className="h-4 w-4" />
              Tirar outra
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          id="tirar-foto-btn"
          onClick={abrirCamera}
          disabled={processing}
          className="group flex w-full min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/60 px-4 py-5 text-brand-700 transition hover:border-brand-500 hover:bg-brand-50 active:scale-[0.98] disabled:opacity-60"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition group-hover:scale-105 group-active:scale-95">
            <CameraIcon className="h-7 w-7" />
          </span>
          <span className="text-base font-semibold">
            {processing ? "Processando foto…" : "Tirar foto do local"}
          </span>
          <span className="text-xs text-brand-700/70">Usa a câmera traseira</span>
        </button>
      )}
    </div>
  );
}
