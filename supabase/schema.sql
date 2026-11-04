-- =============================================================
-- Schema do PWA de registro de escoamentos irregulares
-- Execute no Supabase: SQL Editor → New query → Run
-- =============================================================

-- Tabela principal ------------------------------------------------
create table if not exists public.escoamentos (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  lat              double precision not null check (lat between -90 and 90),
  lng              double precision not null check (lng between -180 and 180),
  foto_url         text not null,
  tipo             text not null check (tipo in ('agua', 'esgoto')),
  mau_cheiro       boolean not null default false,
  ponto_referencia text check (char_length(ponto_referencia) <= 280)
);

create index if not exists escoamentos_created_at_idx
  on public.escoamentos (created_at desc);

-- RLS: envio anônimo permitido apenas para INSERT -------------------
alter table public.escoamentos enable row level security;

drop policy if exists "anon pode inserir escoamentos" on public.escoamentos;
create policy "anon pode inserir escoamentos"
  on public.escoamentos
  for insert
  to anon, authenticated
  with check (true);

-- Storage: bucket público para as fotos ------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'escoamentos-fotos',
  'escoamentos-fotos',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

-- Permite upload (somente INSERT) no bucket para usuários anônimos.
-- A leitura é pública por ser um bucket público (via getPublicUrl).
drop policy if exists "anon pode enviar fotos" on storage.objects;
create policy "anon pode enviar fotos"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'escoamentos-fotos');
