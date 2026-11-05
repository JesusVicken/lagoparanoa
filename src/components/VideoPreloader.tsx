"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2Icon, VolumeXIcon } from "./icons";

interface VideoPreloaderProps {
  onComplete: () => void;
}

export default function VideoPreloader({ onComplete }: VideoPreloaderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  const handleFinish = () => {
    if (fading) return;
    setFading(true);
    setTimeout(() => {
      onComplete();
    }, 600);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Tenta reproduzir o vídeo automaticamente
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("Autoplay bloqueado pelo navegador:", err);
      });
    }

    const onTimeUpdate = () => {
      if (video.duration && !isNaN(video.duration)) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const onEnded = () => {
      handleFinish();
    };

    const onError = () => {
      console.warn("Erro ao carregar o vídeo de introdução.");
      handleFinish();
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSound = () => {
    if (!videoRef.current) return;
    const nextState = !videoRef.current.muted;
    videoRef.current.muted = nextState;
    setIsMuted(nextState);
  };

  return (
    <div
      role="dialog"
      aria-label="Bem-vindo ao EcoParanoá"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-slate-950 transition-opacity duration-600 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Vídeo em tela cheia com leve zoom cinematográfico */}
      <video
        ref={videoRef}
        src="/hero2.mp4"
        autoPlay
        muted={isMuted}
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover scale-105"
      />

      {/* Camada de vinheta cinematográfica para contraste perfeito */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/45 to-slate-950/95 pointer-events-none" />

      {/* Topo do Preloader */}
      <div className="relative z-10 flex w-full max-w-lg items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md ring-1 ring-white/20">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Monitoramento Ambiental
        </span>

        {/* Botão de som */}
        <button
          type="button"
          onClick={toggleSound}
          aria-label={isMuted ? "Ativar som do vídeo" : "Desativar som do vídeo"}
          title={isMuted ? "Ativar som" : "Desativar som"}
          className="grid h-11 w-11 place-items-center rounded-full bg-slate-950/60 text-white backdrop-blur-md ring-1 ring-white/20 transition hover:bg-slate-950/90 active:scale-95"
        >
          {isMuted ? (
            <VolumeXIcon className="h-5 w-5" />
          ) : (
            <Volume2Icon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Card Central com a Logo e a Mensagem de Propósito */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-4 text-center my-auto">
        {/* Logo do EcoParanoá com destaque e leve brilho */}
        <div className="relative mb-3 flex items-center justify-center rounded-3xl bg-white/95 px-6 py-3.5 shadow-2xl backdrop-blur-md ring-1 ring-white/50 animate-pop">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="EcoParanoá"
            className="h-14 sm:h-16 w-auto object-contain"
          />
        </div>

        {/* Card Explicativo com texto aprimorado */}
        <div className="w-full rounded-3xl bg-slate-950/85 p-5 text-white shadow-2xl backdrop-blur-xl border border-white/15 space-y-2.5 animate-slide-up">
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight">
            Cuidando juntos do Lago Paranoá
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed">
            Neste aplicativo você nos ajuda a proteger nossas águas identificando e mapeando pontos de despejos e escoamentos — tanto <strong>clandestinos</strong> quanto <strong>regulares</strong>.
          </p>
          <p className="text-[11px] sm:text-xs text-brand-200 font-medium">
            Seja esgoto ou água pluvial, seu registro com foto e GPS fortalece a preservação e a fiscalização do nosso lago.
          </p>

          <div className="flex flex-wrap justify-center gap-2 pt-1 text-[10px] font-bold text-slate-300">
            <span className="rounded-full bg-white/10 px-2.5 py-1 backdrop-blur-sm border border-white/10">
              🛶 Mapeado por remadores
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 backdrop-blur-sm border border-white/10">
              📍 GPS & Foto em tempo real
            </span>
          </div>
        </div>
      </div>

      {/* Rodapé com botão de acesso e barra de progresso */}
      <footer className="relative z-10 flex w-full max-w-md flex-col items-center gap-3 p-4 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={handleFinish}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500 text-base font-extrabold text-white shadow-2xl shadow-brand-900/50 ring-1 ring-white/30 transition hover:brightness-110 active:scale-95"
        >
          <span>Entrar no aplicativo</span>
          <span aria-hidden="true">→</span>
        </button>

        {/* Barra de progresso */}
        <div className="w-full max-w-xs overflow-hidden rounded-full bg-white/20 h-1.5 backdrop-blur-sm">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-brand-300 to-sky-300 transition-all duration-150 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </footer>
    </div>
  );
}
