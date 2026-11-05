"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { compressImage } from "@/lib/compressImage";
import { fetchEscoamentos } from "@/lib/fetchEscoamentos";
import { submitEscoamento } from "@/lib/submitEscoamento";
import type { EscoamentoItem, LatLng, TipoEscoamento } from "@/lib/types";

import {
  AlertIcon,
  CameraIcon,
  CheckIcon,
  CrosshairIcon,
  DropletIcon,
  MapIcon,
  MapPinIcon,
  PipeIcon,
  RefreshIcon,
  SendIcon,
  SpinnerIcon,
  WindIcon,
} from "./icons";
import PhotoCapture from "./PhotoCapture";
import RecordModal from "./RecordModal";

// Leaflet acessa `window` — só pode ser carregado no navegador.
const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => <MapPlaceholder label="Carregando mapa do Lago…" />,
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

type FilterTipo = "todos" | "agua" | "esgoto";
type ActiveTab = "mapa" | "registro";

function geoErrorMessage(err: GeolocationPositionError | null): string {
  if (!err) return "Seu navegador não oferece geolocalização.";
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Permissão de localização negada. Ative o GPS para registrar com precisão da água.";
    case err.POSITION_UNAVAILABLE:
      return "Não foi possível obter o GPS. Verifique se a localização está ligada.";
    case err.TIMEOUT:
      return "O GPS demorou a responder no lago. Tentando novamente...";
    default:
      return "Erro ao obter localização.";
  }
}

export default function ReportScreen() {
  // --- Navegação mobile por abas ---
  const [activeTab, setActiveTab] = useState<ActiveTab>("mapa");
  const [filterTipo, setFilterTipo] = useState<FilterTipo>("todos");

  // --- Localização ---
  const [geo, setGeo] = useState<GeoState>({ status: "locating" });
  const [initialCenter, setInitialCenter] = useState<LatLng | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [position, setPosition] = useState<LatLng | null>(null);
  const [flyToken, setFlyToken] = useState(0);

  // --- Registros do mapa ---
  const [records, setRecords] = useState<EscoamentoItem[]>([]);
  const [carregandoRecords, setCarregandoRecords] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<EscoamentoItem | null>(null);

  // --- Formulário ---
  const [foto, setFoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [processandoFoto, setProcessandoFoto] = useState(false);
  const [tipo, setTipo] = useState<TipoEscoamento | null>(null);
  const [mauCheiro, setMauCheiro] = useState(false);
  const [pontoReferencia, setPontoReferencia] = useState("");
  const [mostrarErros, setMostrarErros] = useState(false);
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });

  const fotoSectionRef = useRef<HTMLElement>(null);
  const tipoSectionRef = useRef<HTMLFieldSetElement>(null);

  /** Busca os registros já cadastrados */
  const loadRecords = useCallback(async () => {
    setCarregandoRecords(true);
    try {
      const data = await fetchEscoamentos();
      setRecords(data);
    } catch (e) {
      console.warn("Não foi possível carregar os registros:", e);
    } finally {
      setCarregandoRecords(false);
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    fetchEscoamentos()
      .then((data) => {
        if (ativo) setRecords(data);
      })
      .catch((e) => console.warn(e));

    return () => {
      ativo = false;
    };
  }, []);

  /** Pede a posição ao GPS */
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

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const relocate = () => {
    setGeo({ status: "locating" });
    requestLocation();
  };

  const useCurrentGpsForReport = () => {
    if (userLocation) {
      setPosition({ lat: userLocation.lat, lng: userLocation.lng });
      setFlyToken((t) => t + 1);
      navigator.vibrate?.(40);
    } else {
      relocate();
    }
  };

  // Libera blob URL da foto anterior
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
  };

  const startNewReportAtCurrentPosition = () => {
    if (userLocation) {
      setPosition({ lat: userLocation.lat, lng: userLocation.lng });
    }
    setActiveTab("registro");
    navigator.vibrate?.(50);
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
      navigator.vibrate?.([50, 70, 50]);
      await loadRecords();
    } catch (err) {
      setSubmit({
        status: "error",
        message: err instanceof Error ? err.message : "Erro ao enviar registro.",
      });
    }
  };

  const enviando = submit.status === "sending";

  // Filtros de marcadores
  const filteredRecords = records.filter((r) => {
    if (filterTipo === "todos") return true;
    return r.tipo === filterTipo;
  });

  const totalAgua = records.filter((r) => r.tipo === "agua").length;
  const totalEsgoto = records.filter((r) => r.tipo === "esgoto").length;

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-slate-900 font-sans text-slate-900 select-none">
      {/* ==================================================================== */}
      {/* CABEÇALHO MOBILE (Alto contraste sob luz solar)                     */}
      {/* ==================================================================== */}
      <header className="relative z-30 flex shrink-0 items-center justify-between border-b border-brand-900/60 bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 px-4 py-2.5 pt-[max(0.6rem,env(safe-area-inset-top))] text-white shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20 backdrop-blur">
            <PipeIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-extrabold tracking-tight">
              Lago Paranoá
            </h1>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-200">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {userLocation
                ? `GPS ±${Math.round(userLocation.accuracy)}m`
                : geo.status === "locating"
                ? "Buscando GPS..."
                : "Lago Paranoá (DF)"}
            </p>
          </div>
        </div>

        {/* Botão de atualizar dados */}
        <button
          type="button"
          onClick={loadRecords}
          disabled={carregandoRecords}
          aria-label="Atualizar registros do mapa"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white transition active:scale-90"
        >
          <RefreshIcon className={`h-5 w-5 ${carregandoRecords ? "animate-spin" : ""}`} />
        </button>
      </header>

      {/* ==================================================================== */}
      {/* CONTEÚDO PRINCIPAL (ALTERNÂNCIA DE TELAS)                           */}
      {/* ==================================================================== */}
      <main className="relative flex-1 w-full overflow-hidden bg-slate-100">
        {/* ------------------------------------------------------------------ */}
        {/* ABA 1: MAPA EM TELA CHEIA (TOUCH FIRST / CAMPO)                   */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "mapa" && (
          <div className="relative h-full w-full">
            {initialCenter && position ? (
              <MapPicker
                position={position}
                initialCenter={initialCenter}
                userLocation={userLocation}
                records={filteredRecords}
                showPickerPin={false}
                flyToken={flyToken}
                onChange={setPosition}
                onSelectRecord={setSelectedRecord}
              />
            ) : (
              <MapPlaceholder label="Obtendo coordenadas do Lago…" />
            )}

            {/* Filtros em pílulas flutuantes no topo do mapa */}
            <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex justify-center px-3">
              <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-slate-950/85 p-1 text-xs font-bold text-white shadow-xl backdrop-blur-md border border-white/10">
                <button
                  type="button"
                  onClick={() => setFilterTipo("todos")}
                  className={`rounded-full px-3 py-1.5 transition active:scale-95 ${
                    filterTipo === "todos"
                      ? "bg-brand-500 text-white shadow"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Todos ({records.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTipo("agua")}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 transition active:scale-95 ${
                    filterTipo === "agua"
                      ? "bg-sky-500 text-white shadow"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <DropletIcon className="h-3.5 w-3.5" />
                  Água ({totalAgua})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTipo("esgoto")}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 transition active:scale-95 ${
                    filterTipo === "esgoto"
                      ? "bg-amber-600 text-white shadow"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <PipeIcon className="h-3.5 w-3.5" />
                  Esgoto ({totalEsgoto})
                </button>
              </div>
            </div>

            {/* Botão de Centralizar no GPS do remador */}
            <div className="absolute right-3.5 bottom-24 z-[1000]">
              <button
                type="button"
                onClick={relocate}
                disabled={geo.status === "locating"}
                aria-label="Centralizar na minha posição na água"
                title="Minha posição no lago"
                className="glass grid h-14 w-14 place-items-center rounded-2xl text-brand-700 shadow-xl transition active:scale-90 border border-slate-200"
              >
                {geo.status === "locating" ? (
                  <SpinnerIcon className="h-6 w-6 text-brand-600" />
                ) : (
                  <CrosshairIcon className="h-7 w-7 text-brand-600" />
                )}
              </button>
            </div>

            {/* Botão Flutuante de Ação Rápida: Registrar Ocorrência Aqui */}
            <div className="absolute inset-x-4 bottom-5 z-[1000] flex justify-center">
              <button
                type="button"
                onClick={startNewReportAtCurrentPosition}
                className="flex h-14 w-full max-w-sm items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 text-base font-extrabold text-white shadow-2xl shadow-brand-900/40 active:scale-95 transition"
              >
                <CameraIcon className="h-5 w-5" />
                <span>Registrar ponto com foto</span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* ABA 2: FORMULÁRIO DE REGISTRO DIRETO NO BARCO/CANOA               */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "registro" && (
          <div className="h-full w-full overflow-y-auto overscroll-contain px-4 pt-3 pb-36 max-w-xl mx-auto space-y-4">
            {/* Aviso de GPS se houver erro */}
            {geo.status === "error" && (
              <div
                role="alert"
                className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-amber-900 text-xs font-semibold animate-pop"
              >
                <AlertIcon className="h-5 w-5 shrink-0 text-amber-600" />
                <p className="flex-1">{geo.message}</p>
                <button
                  type="button"
                  onClick={relocate}
                  className="rounded-xl bg-amber-200 px-3 py-1.5 font-bold active:scale-95 transition"
                >
                  Tentar GPS
                </button>
              </div>
            )}

            {/* 1. Localização no Lago */}
            <section className="card p-3.5">
              <div className="flex items-center justify-between mb-2">
                <StepTitle n={1} title="Posição no Lago" />
                <button
                  type="button"
                  onClick={useCurrentGpsForReport}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 active:scale-95 transition"
                >
                  <CrosshairIcon className="h-3.5 w-3.5" /> Usar meu GPS
                </button>
              </div>

              {/* Mapa de ajuste fino do pino */}
              <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-slate-200">
                {initialCenter && position ? (
                  <MapPicker
                    position={position}
                    initialCenter={initialCenter}
                    userLocation={userLocation}
                    showPickerPin={true}
                    flyToken={flyToken}
                    onChange={setPosition}
                  />
                ) : (
                  <MapPlaceholder label="Carregando posição..." />
                )}
                <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex justify-between items-center">
                  <span className="glass rounded-lg px-2 py-1 font-mono text-[10px] font-bold text-slate-800 shadow">
                    {position?.lat.toFixed(5)}, {position?.lng.toFixed(5)}
                  </span>
                  <span className="glass rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-600 shadow">
                    Arraste o pino se necessário
                  </span>
                </div>
              </div>
            </section>

            {/* 2. Foto da Ocorrência */}
            <section
              ref={fotoSectionRef}
              className={`card p-4 ${mostrarErros && !foto ? "card--error" : ""}`}
            >
              <StepTitle n={2} title="Foto do local" />
              <PhotoCapture
                previewUrl={foto?.url ?? null}
                processing={processandoFoto}
                onCapture={handleCapture}
                onClear={clearFoto}
              />
              {mostrarErros && !foto && <FieldError>Tire uma foto do local do barco.</FieldError>}
            </section>

            {/* 3. Tipo de escoamento */}
            <fieldset
              ref={tipoSectionRef}
              className={`card p-4 ${mostrarErros && !tipo ? "card--error" : ""}`}
            >
              <legend className="sr-only">Tipo de escoamento</legend>
              <StepTitle n={3} title="O que está escoando?" />
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
              {mostrarErros && !tipo && <FieldError>Selecione se é água ou esgoto.</FieldError>}
            </fieldset>

            {/* 4. Detalhes */}
            <section className="card p-4 space-y-3">
              <StepTitle n={4} title="Detalhes rápidos" />

              <label
                htmlFor="mau-cheiro"
                className="group flex min-h-14 cursor-pointer items-center gap-3.5 rounded-2xl border border-slate-200 bg-white px-3.5 transition has-[:checked]:border-rose-400 has-[:checked]:bg-rose-50 active:scale-[0.99]"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500 group-has-[:checked]:bg-rose-100 group-has-[:checked]:text-rose-600 transition">
                  <WindIcon className="h-5 w-5" />
                </span>
                <span className="flex-1 text-sm font-bold text-slate-800">
                  Tem mau cheiro forte?
                </span>
                <input
                  id="mau-cheiro"
                  type="checkbox"
                  checked={mauCheiro}
                  onChange={(e) => setMauCheiro(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="grid h-8 w-8 place-items-center rounded-xl border-2 border-slate-300 bg-white text-white transition peer-checked:border-rose-600 peer-checked:bg-rose-600">
                  <CheckIcon className="h-5 w-5" strokeWidth={3} />
                </span>
              </label>

              <div>
                <label
                  htmlFor="ponto-referencia"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500"
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
                  placeholder="Ex.: em frente ao deck sul, próximo ao clube..."
                  className="h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
                />
              </div>
            </section>

            {submit.status === "error" && (
              <div
                role="alert"
                className="flex gap-2.5 rounded-2xl border border-rose-300 bg-rose-50 p-3.5 text-xs font-semibold text-rose-900 animate-pop"
              >
                <AlertIcon className="h-5 w-5 shrink-0 text-rose-600" />
                <p className="flex-1 break-words">{submit.message}</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ==================================================================== */}
      {/* BOTÃO FIXO DE ENVIO (QUANDO NA ABA DE REGISTRO)                      */}
      {/* ==================================================================== */}
      {activeTab === "registro" && (
        <div className="fixed inset-x-0 bottom-16 z-30 mx-auto w-full max-w-xl border-t border-slate-200 bg-white/95 px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          {mostrarErros && faltando.length > 0 && (
            <p className="mb-1.5 text-center text-xs font-bold text-rose-600 animate-pop">
              Falta preencher: {faltando.join(" e ")}
            </p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={enviando || !position}
            className="btn-primary h-14 text-base font-extrabold shadow-xl"
          >
            {enviando ? (
              <>
                <SpinnerIcon className="h-5 w-5" /> Salvando registro…
              </>
            ) : (
              <>
                <SendIcon className="h-5 w-5" /> Confirmar e Enviar
              </>
            )}
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* BARRA DE NAVEGAÇÃO INFERIOR MOBILE (ALCANCE DO POLEGAR)              */}
      {/* ==================================================================== */}
      <nav
        aria-label="Navegação do aplicativo"
        className="relative z-40 flex h-16 w-full shrink-0 items-center justify-around border-t border-slate-200/80 bg-white/95 px-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl shadow-lg"
      >
        <button
          type="button"
          onClick={() => setActiveTab("mapa")}
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 transition active:scale-95 ${
            activeTab === "mapa" ? "text-brand-600 font-extrabold" : "text-slate-400 font-medium"
          }`}
        >
          <div className="relative">
            <MapIcon className="h-6 w-6" />
            {records.length > 0 && (
              <span className="absolute -top-1 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[9px] font-bold text-white">
                {records.length}
              </span>
            )}
          </div>
          <span className="text-[11px] leading-none">Mapa do Lago</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("registro")}
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 transition active:scale-95 ${
            activeTab === "registro" ? "text-brand-600 font-extrabold" : "text-slate-400 font-medium"
          }`}
        >
          <div
            className={`grid h-9 w-9 place-items-center rounded-full transition ${
              activeTab === "registro"
                ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <CameraIcon className="h-5 w-5" />
          </div>
          <span className="text-[11px] leading-none">Registrar</span>
        </button>
      </nav>

      {/* ==================================================================== */}
      {/* MODAL / BOTTOM SHEET DE DETALHES DE PONTO                            */}
      {/* ==================================================================== */}
      {selectedRecord && (
        <RecordModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      {/* ==================================================================== */}
      {/* OVERLAY DE SUCESSO APÓS REGISTRO                                     */}
      {/* ==================================================================== */}
      {submit.status === "success" && position && (
        <SuccessOverlay
          position={position}
          onViewMap={() => {
            resetForm();
            setActiveTab("mapa");
          }}
          onNew={() => {
            resetForm();
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function MapPlaceholder({ label }: { label: string }) {
  return (
    <div className="map-skeleton flex h-full w-full flex-col items-center justify-center gap-3 text-brand-800">
      <span className="relative grid h-14 w-14 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/30" />
        <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white shadow-lg">
          <MapPinIcon className="h-6 w-6" />
        </span>
      </span>
      <p className="text-xs font-bold text-slate-700">{label}</p>
    </div>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
        {n}
      </span>
      {title}
    </h2>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-rose-600">
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
      on: "border-sky-500 bg-sky-50 text-sky-900 shadow-md ring-2 ring-sky-300",
      icon: "bg-sky-500 text-white",
      iconOff: "bg-sky-100 text-sky-700",
    },
    sewage: {
      on: "border-amber-600 bg-amber-50 text-amber-950 shadow-md ring-2 ring-amber-300",
      icon: "bg-amber-600 text-white",
      iconOff: "bg-amber-100 text-amber-800",
    },
  }[tone];

  return (
    <label
      htmlFor={id}
      className={`relative flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 text-center transition active:scale-[0.97] ${
        selected ? tones.on : "border-slate-200 bg-white text-slate-700"
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
        className={`grid h-11 w-11 place-items-center rounded-2xl transition ${
          selected ? tones.icon : tones.iconOff
        }`}
      >
        {icon}
      </span>
      <span className="text-base font-extrabold leading-none">{label}</span>
      <span className="text-[11px] font-medium opacity-80">{hint}</span>
      {selected && (
        <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-current text-white animate-pop">
          <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
    </label>
  );
}

function SuccessOverlay({
  position,
  onViewMap,
  onNew,
}: {
  position: LatLng;
  onViewMap: () => void;
  onNew: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 p-3 backdrop-blur-md animate-fade"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl animate-slide-up">
        <span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-600 animate-pop">
          <CheckIcon className="h-9 w-9" strokeWidth={3} />
        </span>
        <h2 className="text-xl font-extrabold text-slate-900">
          Registro Salvo!
        </h2>
        <p className="mt-1.5 text-xs font-medium text-slate-600">
          Obrigado por ajudar a proteger o Lago Paranoá.
        </p>
        <p className="mt-2 font-mono text-[11px] text-slate-400">
          {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onViewMap}
            className="btn-primary h-13 text-sm font-bold"
          >
            <MapIcon className="h-4 w-4" /> Ver no mapa do Lago
          </button>
          <button
            type="button"
            onClick={onNew}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700 active:scale-95 transition"
          >
            Registrar outro ponto
          </button>
        </div>
      </div>
    </div>
  );
}
