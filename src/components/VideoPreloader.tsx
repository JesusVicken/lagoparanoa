"use client";

import { useEffect, useRef, useState } from "react";
import { PipeIcon, Volume2Icon, VolumeXIcon } from "./icons";

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
      aria-label="Carregando aplicativo"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-slate-950 transition-opacity duration-600 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Vídeo em tela cheia */}
      <video
        ref={videoRef}
        src="/hero2.mp4"
        autoPlay
        muted={isMuted}
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Camada de contraste para legibilidade */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-transparent to-slate-950/90 pointer-events-none" />

      {/* Cabeçalho */}
      <header className="relative z-10 flex w-full max-w-xl items-center justify-between p-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20 text-white backdrop-blur-md ring-1 ring-white/30 shadow-lg">
            <PipeIcon className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-300">
              Lago Paranoá
            </p>
            <h1 className="text-base font-bold text-white drop-shadow">
              Monitoramento Ambiental
            </h1>
          </div>
        </div>

        {/* Alternador de áudio */}
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
      </header>

      {/* Rodapé com botão pular e barra de progresso */}
      <footer className="relative z-10 flex w-full max-w-xl flex-col items-center gap-4 p-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={handleFinish}
          className="flex items-center gap-2 rounded-2xl bg-white/25 px-6 py-3.5 text-sm font-bold text-white shadow-2xl backdrop-blur-md ring-1 ring-white/30 transition hover:bg-white/35 active:scale-95"
        >
          <span>Pular introdução</span>
          <span aria-hidden="true">→</span>
        </button>

        {/* Barra de progresso */}
        <div className="w-full max-w-xs overflow-hidden rounded-full bg-white/20 h-1.5 backdrop-blur-sm">
          <div
            className="h-full bg-gradient-to-r from-brand-400 to-sky-300 transition-all duration-150 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </footer>
    </div>
  );
}
