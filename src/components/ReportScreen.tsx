"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { compressImage } from "@/lib/compressImage";
import { fetchEscoamentos } from "@/lib/fetchEscoamentos";
import { submitEscoamento } from "@/lib/submitEscoamento";
import type { EscoamentoItem, LatLng, TipoEscoamento } from "@/lib/types";

import {
  AlertIcon,
  CheckIcon,
  CrosshairIcon,
  DropletIcon,
  MapPinIcon,
  MaximizeIcon,
  MinimizeIcon,
  PipeIcon,
  SendIcon,
  SpinnerIcon,
  WindIcon,
} from "./icons";
import PhotoCapture from "./PhotoCapture";
import RecordModal from "./RecordModal";

// Leaflet acessa `window` — só pode ser carregado no navegador.
const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => <MapPlaceholder label="Carregando mapa…" />,
});

/** Centro do Lago Paranoá — usado apenas se a localização for negada. */
const FALLBACK_CENTER: LatLng = { lat: -15.7934, lng: -47.8256 };

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

type UserLocation = LatLng & { accuracy: number };

type GeoState =
  | { status: "locating" }
  | { status: "ready" }
  | { status: "error"; message: string };

type SubmitState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "success" }
  | { status: "error"; message: string };

function geoErrorMessage(err: GeolocationPositionError | null): string {
  if (!err) return "Seu navegador não oferece geolocalização.";
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Permissão de localização negada. Ative-a nas configurações do navegador ou arraste o pino manualmente.";
    case err.POSITION_UNAVAILABLE:
      return "Não foi possível determinar sua posição. Verifique se o GPS está ligado.";
    case err.TIMEOUT:
      return "O GPS demorou demais para responder. Tente novamente em local aberto.";
    default:
      return "Erro ao obter localização.";
  }
}

export default function ReportScreen() {
  // --- Localização -----------------------------------------------------------
  const [geo, setGeo] = useState<GeoState>({ status: "locating" });
  const [initialCenter, setInitialCenter] = useState<LatLng | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [position, setPosition] = useState<LatLng | null>(null);
  const [flyToken, setFlyToken] = useState(0);

  // --- Registros do mapa -----------------------------------------------------
  const [records, setRecords] = useState<EscoamentoItem[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<EscoamentoItem | null>(null);
  const [mapaExpandido, setMapaExpandido] = useState(false);

  // --- Formulário ------------------------------------------------------------
  const [foto, setFoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [processandoFoto, setProcessandoFoto] = useState(false);
  const [tipo, setTipo] = useState<TipoEscoamento | null>(null);
  const [mauCheiro, setMauCheiro] = useState(false);
  const [pontoReferencia, setPontoReferencia] = useState("");
  const [mostrarErros, setMostrarErros] = useState(false);
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });

  const fotoSectionRef = useRef<HTMLElement>(null);
  const tipoSectionRef = useRef<HTMLFieldSetElement>(null);

  /** Busca os registros já cadastrados para marcar no mapa */
  const loadRecords = useCallback(async () => {
    try {
      const data = await fetchEscoamentos();
      setRecords(data);
    } catch (e) {
      console.warn("Não foi possível carregar os registros anteriores:", e);
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    fetchEscoamentos()
      .then((data) => {
        if (ativo) setRecords(data);
      })
      .catch((e) => {
        console.warn("Falha ao carregar escoamentos:", e);
      });

    return () => {
      ativo = false;
    };
  }, []);

  /** Pede a posição ao navegador. Na 1ª leitura, define o centro do mapa. */
  const requestLocation = useCallback(() => {
    const onSuccess = (pos: GeolocationPosition) => {
      const coords: UserLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
      setUserLocation(coords);
      setPosition({ lat: coords.lat, lng: coords.lng });
      setInitialCenter((prev) => prev ?? { lat: coords.lat, lng: coords.lng });
      setFlyToken((t) => t + 1);
      setGeo({ status: "ready" });
    };

    const onError = (err: GeolocationPositionError | null) => {
      setInitialCenter((prev) => prev ?? FALLBACK_CENTER);
      setPosition((prev) => prev ?? FALLBACK_CENTER);
      setGeo({ status: "error", message: geoErrorMessage(err) });
    };

    if (!("geolocation" in navigator)) {
      queueMicrotask(() => onError(null));
      return;
    }

    navigator.geolocation.getCurrentPosition(onSuccess, onError, GEO_OPTIONS);
  }, []);

  // Solicita a localização assim que o componente monta.
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const relocate = () => {
    setGeo({ status: "locating" });
    requestLocation();
  };

  // Libera o blob URL da foto anterior.
  const fotoUrlRef = useRef<string | null>(null);
  useEffect(() => {
    fotoUrlRef.current = foto?.url ?? null;
  }, [foto]);
  useEffect(
    () => () => {
      if (fotoUrlRef.current) URL.revokeObjectURL(fotoUrlRef.current);
    },
    [],
  );

  const handleCapture = async (file: File) => {
    setProcessandoFoto(true);
    try {
      const blob = await compressImage(file);
      setFoto((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { blob, url: URL.createObjectURL(blob) };
      });
    } finally {
      setProcessandoFoto(false);
    }
  };

  const clearFoto = () => {
    setFoto((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  const resetForm = () => {
    clearFoto();
    setTipo(null);
    setMauCheiro(false);
    setPontoReferencia("");
    setMostrarErros(false);
    setSubmit({ status: "idle" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const faltando: string[] = [];
  if (!foto) faltando.push("foto");
  if (!tipo) faltando.push("tipo");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submit.status === "sending" || !position) return;

    if (!foto || !tipo) {
      setMostrarErros(true);
      const alvo = !foto ? fotoSectionRef.current : tipoSectionRef.current;
      alvo?.scrollIntoView({ behavior: "smooth", block: "center" });
      navigator.vibrate?.(80);
      return;
    }

    setSubmit({ status: "sending" });
    try {
      await submitEscoamento({
        lat: position.lat,
        lng: position.lng,
        foto: foto.blob,
        tipo,
        mauCheiro,
        pontoReferencia,
      });
      setSubmit({ status: "success" });
      navigator.vibrate?.([40, 60, 40]);
      // Atualiza os pontos no mapa para o novo registro aparecer de imediato
      loadRecords();
    } catch (err) {
      setSubmit({
        status: "error",
        message: err instanceof Error ? err.message : "Erro inesperado ao enviar.",
      });
    }
  };

  const enviando = submit.status === "sending";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col bg-slate-50 md:shadow-2xl md:shadow-slate-900/10">
      {/* Cabeçalho ---------------------------------------------------------- */}
      <header className="relative z-20 flex items-center justify-between gap-3 bg-gradient-to-r from-brand-800 via-brand-700 to-brand-600 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <PipeIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-100/80">
              Lago Paranoá
            </p>
            <h1 className="truncate text-lg font-bold leading-tight">
              Registrar escoamento irregular
            </h1>
          </div>
        </div>

        {/* Contador de pontos no topo */}
        {records.length > 0 && (
          <div className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur text-brand-50 border border-white/20">
            {records.length} {records.length === 1 ? "registro" : "registros"}
          </div>
        )}
      </header>

      {/* Mapa --------------------------------------------------------------- */}
      <section
        aria-label="Mapa para marcar e visualizar locais"
        className={`relative isolate transition-all duration-300 w-full bg-slate-200 ${
          mapaExpandido
            ? "fixed inset-0 z-50 h-dvh max-w-none"
            : "h-[46svh] min-h-80"
        }`}
      >
        {initialCenter && position ? (
          <MapPicker
            position={position}
            initialCenter={initialCenter}
            userLocation={userLocation}
            records={records}
            flyToken={flyToken}
            onChange={setPosition}
            onSelectRecord={setSelectedRecord}
          />
        ) : (
          <MapPlaceholder label="Obtendo sua localização…" />
        )}

        {/* Barra superior de status e legenda */}
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex flex-col items-center gap-1.5 px-3">
          <div className="glass pointer-events-auto flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-md">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {records.length > 0
                ? `${records.length} ${records.length === 1 ? "local com foto" : "locais com foto"}`
                : "Arraste o pino até o local"}
            </span>
            {records.length > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Toque nos pinos para ver a foto
                </span>
              </>
            )}
          </div>

          {/* Legenda simples dos marcadores */}
          <div className="flex items-center gap-2.5 rounded-full bg-slate-900/80 px-3 py-1 text-[10px] font-medium text-white shadow-md backdrop-blur-md">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sky-400" /> Água
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Esgoto
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-brand-400" /> Seu pino
            </span>
          </div>
        </div>

        {/* Controles inferiores do Mapa */}
        {position && (
          <div className="absolute inset-x-3 bottom-6 z-[1000] flex items-end justify-between gap-3">
            <div className="glass rounded-2xl px-3 py-2 shadow-lg">
              <p className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-slate-700">
                <MapPinIcon className="h-3.5 w-3.5 text-brand-600" />
                {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
              </p>
              {userLocation && (
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Precisão do GPS: ±{Math.round(userLocation.accuracy)} m
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Botão de Tela Cheia / Reduzir Mapa */}
              <button
                type="button"
                id="toggle-mapa-expandido-btn"
                onClick={() => setMapaExpandido((prev) => !prev)}
                aria-label={mapaExpandido ? "Reduzir mapa" : "Expandir mapa em tela cheia"}
                title={mapaExpandido ? "Reduzir mapa" : "Ver mapa em tela cheia"}
                className="glass grid h-13 w-13 shrink-0 place-items-center rounded-2xl text-slate-700 shadow-lg transition active:scale-90"
              >
                {mapaExpandido ? (
                  <MinimizeIcon className="h-5 w-5" />
                ) : (
                  <MaximizeIcon className="h-5 w-5" />
                )}
              </button>

              {/* Botão de recentralizar */}
              <button
                type="button"
                id="recentralizar-btn"
                onClick={relocate}
                disabled={geo.status === "locating"}
                aria-label="Voltar para minha localização"
                title="Voltar para minha localização"
                className="glass grid h-13 w-13 shrink-0 place-items-center rounded-2xl text-brand-700 shadow-lg transition active:scale-90 disabled:opacity-70"
              >
                {geo.status === "locating" ? (
                  <SpinnerIcon className="h-5 w-5" />
                ) : (
                  <CrosshairIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Botão flutuante para sair do modo expandido */}
        {mapaExpandido && (
          <div className="absolute top-4 right-4 z-[1001]">
            <button
              type="button"
              onClick={() => setMapaExpandido(false)}
              className="glass flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-slate-800 shadow-xl transition active:scale-95"
            >
              <MinimizeIcon className="h-4 w-4" /> Fechar tela cheia
            </button>
          </div>
        )}
      </section>

      {/* Formulário --------------------------------------------------------- */}
      <form
        id="escoamento-form"
        onSubmit={handleSubmit}
        noValidate
        className="relative z-10 -mt-5 flex-1 space-y-4 rounded-t-3xl bg-slate-50 px-4 pb-36 pt-5"
      >
        <div className="mx-auto -mt-2 mb-1 h-1.5 w-10 rounded-full bg-slate-300" />

        {geo.status === "error" && (
          <div
            role="alert"
            className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 animate-pop"
          >
            <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1 text-sm">
              <p>{geo.message}</p>
              <button
                type="button"
                id="tentar-localizacao-btn"
                onClick={relocate}
                className="mt-2 min-h-11 rounded-xl bg-amber-200/70 px-4 font-semibold active:scale-95 transition"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* 1. Foto */}
        <section
          ref={fotoSectionRef}
          className={`card ${mostrarErros && !foto ? "card--error" : ""}`}
        >
          <StepTitle n={1} title="Foto do local" />
          <PhotoCapture
            previewUrl={foto?.url ?? null}
            processing={processandoFoto}
            onCapture={handleCapture}
            onClear={clearFoto}
          />
          {mostrarErros && !foto && <FieldError>Tire uma foto do escoamento.</FieldError>}
        </section>

        {/* 2. Tipo */}
        <fieldset
          ref={tipoSectionRef}
          className={`card ${mostrarErros && !tipo ? "card--error" : ""}`}
        >
          <legend className="sr-only">Tipo de escoamento</legend>
          <StepTitle n={2} title="O que está escoando?" />
          <div className="grid grid-cols-2 gap-3">
            <TipoOption
              id="tipo-agua"
              value="agua"
              label="Água"
              hint="Limpa ou pluvial"
              selected={tipo === "agua"}
              onSelect={setTipo}
              icon={<DropletIcon className="h-7 w-7" />}
              tone="water"
            />
            <TipoOption
              id="tipo-esgoto"
              value="esgoto"
              label="Esgoto"
              hint="Escura ou turva"
              selected={tipo === "esgoto"}
              onSelect={setTipo}
              icon={<PipeIcon className="h-7 w-7" />}
              tone="sewage"
            />
          </div>
          {mostrarErros && !tipo && <FieldError>Selecione o tipo.</FieldError>}
        </fieldset>

        {/* 3. Detalhes */}
        <section className="card space-y-4">
          <StepTitle n={3} title="Detalhes" />

          <label
            htmlFor="mau-cheiro"
            className="group flex min-h-16 cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 transition has-[:checked]:border-rose-300 has-[:checked]:bg-rose-50 active:scale-[0.99]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500 transition group-has-[:checked]:bg-rose-100 group-has-[:checked]:text-rose-600">
              <WindIcon className="h-5 w-5" />
            </span>
            <span className="flex-1 text-base font-semibold text-slate-800">
              Possui mau cheiro?
            </span>
            <input
              id="mau-cheiro"
              type="checkbox"
              checked={mauCheiro}
              onChange={(e) => setMauCheiro(e.target.checked)}
              className="peer sr-only"
            />
            <span className="grid h-8 w-8 place-items-center rounded-lg border-2 border-slate-300 bg-white text-white transition peer-checked:border-rose-500 peer-checked:bg-rose-500 peer-focus-visible:ring-4 peer-focus-visible:ring-rose-200">
              <CheckIcon className="h-5 w-5" strokeWidth={3} />
            </span>
          </label>

          <div>
            <label
              htmlFor="ponto-referencia"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Ponto de referência / Descrição
            </label>
            <input
              id="ponto-referencia"
              type="text"
              inputMode="text"
              autoComplete="off"
              enterKeyHint="done"
              maxLength={280}
              value={pontoReferencia}
              onChange={(e) => setPontoReferencia(e.target.value)}
              placeholder="Ex.: próximo à ponte, deck sul, árvore grande"
              className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
            />
          </div>
        </section>

        {submit.status === "error" && (
          <div
            role="alert"
            className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 animate-pop"
          >
            <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="flex-1 break-words">{submit.message}</p>
          </div>
        )}
      </form>

      {/* Barra de envio fixa ------------------------------------------------ */}
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-xl border-t border-slate-200/70 bg-white/85 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        {mostrarErros && faltando.length > 0 && (
          <p className="mb-2 text-center text-xs font-medium text-rose-600">
            Falta: {faltando.join(" e ")}
          </p>
        )}
        <button
          type="submit"
          form="escoamento-form"
          id="enviar-btn"
          disabled={enviando || !position}
          className="btn-primary"
        >
          {enviando ? (
            <>
              <SpinnerIcon className="h-6 w-6" /> Enviando…
            </>
          ) : (
            <>
              <SendIcon className="h-5 w-5" /> Enviar registro
            </>
          )}
        </button>
      </div>

      {/* Modal de confirmação de envio */}
      {submit.status === "success" && position && (
        <SuccessOverlay position={position} onNew={resetForm} />
      )}

      {/* Modal de exibição da foto e detalhes ao clicar em um ponto do mapa */}
      {selectedRecord && (
        <RecordModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </main>
  );
}

/* -------------------------------------------------------------------------- */

function MapPlaceholder({ label }: { label: string }) {
  return (
    <div className="map-skeleton flex h-full w-full flex-col items-center justify-center gap-3 text-brand-800">
      <span className="relative grid h-16 w-16 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/30" />
        <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white shadow-lg">
          <MapPinIcon className="h-6 w-6" />
        </span>
      </span>
      <p className="text-sm font-semibold">{label}</p>
    </div>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2.5 text-base font-bold text-slate-900">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
        {n}
      </span>
      {title}
    </h2>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-rose-600">
      <AlertIcon className="h-4 w-4" /> {children}
    </p>
  );
}

interface TipoOptionProps {
  id: string;
  value: TipoEscoamento;
  label: string;
  hint: string;
  selected: boolean;
  icon: React.ReactNode;
  tone: "water" | "sewage";
  onSelect: (v: TipoEscoamento) => void;
}

function TipoOption({ id, value, label, hint, selected, icon, tone, onSelect }: TipoOptionProps) {
  const tones = {
    water: {
      on: "border-sky-500 bg-sky-50 text-sky-800 shadow-sky-500/20",
      icon: "bg-sky-500 text-white",
      iconOff: "bg-sky-100 text-sky-600",
    },
    sewage: {
      on: "border-amber-600 bg-amber-50 text-amber-900 shadow-amber-600/20",
      icon: "bg-amber-600 text-white",
      iconOff: "bg-amber-100 text-amber-700",
    },
  }[tone];

  return (
    <label
      htmlFor={id}
      className={`relative flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 text-center transition active:scale-[0.97] ${
        selected ? `${tones.on} shadow-lg` : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      <input
        id={id}
        type="radio"
        name="tipo"
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        className="peer sr-only"
      />
      <span
        className={`grid h-12 w-12 place-items-center rounded-full transition ${
          selected ? tones.icon : tones.iconOff
        }`}
      >
        {icon}
      </span>
      <span className="text-lg font-bold leading-none">{label}</span>
      <span className="text-xs opacity-70">{hint}</span>
      {selected && (
        <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-current animate-pop">
          <CheckIcon className="h-4 w-4 text-white" strokeWidth={3} />
        </span>
      )}
      <span className="pointer-events-none absolute inset-0 rounded-2xl ring-brand-500/40 peer-focus-visible:ring-4" />
    </label>
  );
}

function SuccessOverlay({ position, onNew }: { position: LatLng; onNew: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sucesso-titulo"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade sm:items-center"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl animate-slide-up">
        <span className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600 animate-pop">
          <CheckIcon className="h-10 w-10" strokeWidth={3} />
        </span>
        <h2 id="sucesso-titulo" className="text-2xl font-bold text-slate-900">
          Registro enviado!
        </h2>
        <p className="mt-2 text-slate-600">
          Obrigado por ajudar a proteger o Lago Paranoá.
        </p>
        <p className="mt-3 font-mono text-xs text-slate-400">
          {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
        </p>
        <button type="button" id="novo-registro-btn" onClick={onNew} className="btn-primary mt-6">
          Registrar outro
        </button>
      </div>
    </div>
  );
}
