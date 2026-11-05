"use client";

import { useEffect } from "react";
import type { EscoamentoItem } from "@/lib/types";
import { CheckIcon, DropletIcon, MapPinIcon, PipeIcon, WindIcon, XIcon, ZoomInIcon } from "./icons";

interface RecordModalProps {
  record: EscoamentoItem;
  onClose: () => void;
}

export default function RecordModal({ record, onClose }: RecordModalProps) {
  // Fecha com a tecla ESC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const dataFormatada = new Date(record.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isEsgoto = record.tipo === "esgoto";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-detalhes-titulo"
      className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-slate-950/75 p-0 sm:p-4 backdrop-blur-md animate-fade"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] sm:rounded-3xl bg-white shadow-2xl animate-slide-up border-t sm:border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior de puxar (Mobile Handle) */}
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-300 sm:hidden" />

        {/* Foto do local */}
        <div className="relative aspect-video sm:aspect-[16/10] w-full bg-slate-900 overflow-hidden mt-2 sm:mt-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={record.foto_url}
            alt={record.ponto_referencia || `Escoamento de ${record.tipo}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />

          {/* Botão fechar sobre a imagem (área de toque grande para dedos molhados) */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes"
            className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-slate-950/70 text-white backdrop-blur-md transition hover:bg-slate-950 active:scale-90 shadow-lg ring-1 ring-white/20"
          >
            <XIcon className="h-6 w-6" />
          </button>

          {/* Badges de tipo e odor sobre a imagem */}
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 pointer-events-none">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-md ring-1 ring-white/20 ${
                isEsgoto ? "bg-amber-600/95" : "bg-sky-600/95"
              }`}
            >
              {isEsgoto ? <PipeIcon className="h-4 w-4" /> : <DropletIcon className="h-4 w-4" />}
              {isEsgoto ? "Esgoto identificado" : "Água limpa / pluvial"}
            </span>

            {record.mau_cheiro ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600/95 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-md ring-1 ring-white/20">
                <WindIcon className="h-4 w-4" /> Mau cheiro relatado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/85 px-3 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur-md ring-1 ring-white/10">
                <CheckIcon className="h-3.5 w-3.5 text-emerald-400" /> Sem mau cheiro
              </span>
            )}
          </div>
        </div>

        {/* Informações detalhadas */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Ponto de referência / Descrição
            </span>
            <p className="mt-1 text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {record.ponto_referencia ? (
                record.ponto_referencia
              ) : (
                <span className="italic text-slate-400 font-normal">
                  Nenhum ponto de referência informado.
                </span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-slate-500 block font-medium">Data do registro</span>
              <span className="font-bold text-slate-800 mt-1 block text-sm">{dataFormatada}</span>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-slate-500 block font-medium">Coordenadas no Lago</span>
              <span className="font-mono font-bold text-slate-800 mt-1 flex items-center gap-1 truncate text-xs">
                <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                {record.lat.toFixed(5)}, {record.lng.toFixed(5)}
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé com toque amplo */}
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-3">
          <a
            href={record.foto_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-800 active:scale-95 transition"
          >
            <ZoomInIcon className="h-4 w-4" /> Ver foto original
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 min-w-28 items-center justify-center rounded-2xl bg-slate-900 px-6 text-sm font-bold text-white shadow-md active:scale-95 transition hover:bg-slate-800"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
