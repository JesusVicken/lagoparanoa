"use client";

import { useEffect } from "react";
import type { EscoamentoItem } from "@/lib/types";
import { CheckIcon, DropletIcon, MapPinIcon, PipeIcon, WindIcon, XIcon } from "./icons";

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
      className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-md animate-fade"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Imagem do local com botão fechar */}
        <div className="relative aspect-video w-full bg-slate-900 overflow-hidden sm:max-h-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={record.foto_url}
            alt={record.ponto_referencia || `Escoamento de ${record.tipo}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />

          {/* Botão fechar sobre a imagem */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes"
            className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-slate-950/60 text-white backdrop-blur-md transition hover:bg-slate-950 active:scale-95"
          >
            <XIcon className="h-5 w-5" />
          </button>

          {/* Tag de tipo sobre a foto */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white shadow-md backdrop-blur-md ${
                isEsgoto ? "bg-amber-600/95" : "bg-sky-600/95"
              }`}
            >
              {isEsgoto ? <PipeIcon className="h-3.5 w-3.5" /> : <DropletIcon className="h-3.5 w-3.5" />}
              {isEsgoto ? "Esgoto" : "Água pluvial / limpa"}
            </span>

            {record.mau_cheiro ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600/95 px-3 py-1 text-xs font-bold text-white shadow-md backdrop-blur-md">
                <WindIcon className="h-3.5 w-3.5" /> Mau cheiro relatado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-slate-200 backdrop-blur-md">
                <CheckIcon className="h-3 w-3" /> Sem mau cheiro
              </span>
            )}
          </div>
        </div>

        {/* Informações detalhadas */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Ponto de referência / Descrição
            </span>
            <p className="mt-1 text-base font-semibold text-slate-800 leading-snug">
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
            <div className="rounded-2xl bg-slate-50 p-3">
              <span className="text-slate-400 block font-medium">Data do registro</span>
              <span className="font-semibold text-slate-700 mt-0.5 block">{dataFormatada}</span>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <span className="text-slate-400 block font-medium">Coordenadas</span>
              <span className="font-mono font-semibold text-slate-700 mt-0.5 flex items-center gap-1 truncate">
                <MapPinIcon className="h-3 w-3 shrink-0 text-brand-600" />
                {record.lat.toFixed(5)}, {record.lng.toFixed(5)}
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex justify-between items-center">
          <a
            href={record.foto_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-brand-700 hover:text-brand-800 underline underline-offset-2"
          >
            Abrir foto original em nova aba
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-95"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
