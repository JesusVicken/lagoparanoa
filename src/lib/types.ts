export type TipoEscoamento = "agua" | "esgoto";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface NovoEscoamento extends LatLng {
  foto: Blob;
  tipo: TipoEscoamento;
  mauCheiro: boolean;
  pontoReferencia: string;
}

/** Linha da tabela `escoamentos` no Supabase. */
export interface EscoamentoRow {
  lat: number;
  lng: number;
  foto_url: string;
  tipo: TipoEscoamento;
  mau_cheiro: boolean;
  ponto_referencia: string | null;
}
