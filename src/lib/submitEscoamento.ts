import { getSupabase, SUPABASE_BUCKET } from "./supabase";
import type { EscoamentoRow, NovoEscoamento } from "./types";

const EXTENSOES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

function gerarId(): string {
  // crypto.randomUUID só existe em contexto seguro (HTTPS/localhost).
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 1. Faz upload da foto para o bucket do Supabase Storage;
 * 2. Obtém a URL pública;
 * 3. Insere o registro na tabela `escoamentos`.
 *
 * Retorna a URL pública da foto. Lança `Error` com mensagem amigável em caso de falha.
 */
export async function submitEscoamento(dados: NovoEscoamento): Promise<string> {
  const supabase = getSupabase();

  // --- 1. Upload da imagem ---------------------------------------------------
  const contentType = dados.foto.type || "image/jpeg";
  const ext = EXTENSOES[contentType] ?? "jpg";
  const agora = new Date();
  const pasta = `${agora.getFullYear()}/${String(agora.getMonth() + 1).padStart(2, "0")}`;
  const caminho = `${pasta}/${gerarId()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(caminho, dados.foto, {
      contentType,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Falha ao enviar a foto: ${uploadError.message}`);
  }

  // --- 2. URL pública -----------------------------------------------------------
  const {
    data: { publicUrl },
  } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(caminho);

  // --- 3. Registro na tabela ----------------------------------------------------
  const registro: EscoamentoRow = {
    lat: dados.lat,
    lng: dados.lng,
    foto_url: publicUrl,
    tipo: dados.tipo,
    mau_cheiro: dados.mauCheiro,
    ponto_referencia: dados.pontoReferencia.trim() || null,
  };

  // Sem .select(): o usuário anônimo só tem permissão de INSERT (RLS).
  const { error: insertError } = await supabase
    .from("escoamentos")
    .insert(registro);

  if (insertError) {
    throw new Error(`Falha ao salvar o registro: ${insertError.message}`);
  }

  return publicUrl;
}
