import { getSupabase } from "./supabase";
import type { EscoamentoItem } from "./types";

/**
 * Busca todos os registros de escoamento no Supabase para exibir no mapa.
 * Retorna uma lista vazia caso o Supabase não esteja configurado ou haja erro na consulta.
 */
export async function fetchEscoamentos(): Promise<EscoamentoItem[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("escoamentos")
      .select("id, created_at, lat, lng, foto_url, tipo, mau_cheiro, ponto_referencia")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Aviso ao buscar escoamentos no Supabase:", error.message);
      return [];
    }

    return (data as EscoamentoItem[]) || [];
  } catch (err) {
    console.warn("Supabase não configurado ou indisponível ao carregar registros:", err);
    return [];
  }
}
