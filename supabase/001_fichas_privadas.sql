-- Railroad RPG - fichas privadas (primeira etapa da persistência na nuvem).
-- Execute no SQL Editor do Supabase. RLS é obrigatório para usar a chave pública.

create table if not exists public.fichas (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid not null references auth.users(id) on delete cascade,
    titulo text not null default 'Novo personagem' check (char_length(titulo) between 1 and 120),
    dados jsonb not null default '{}'::jsonb check (jsonb_typeof(dados) = 'object'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists fichas_usuario_atualizacao_idx
    on public.fichas (usuario_id, updated_at desc);

create or replace function public.atualizar_data_ficha()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists fichas_atualizadas_em on public.fichas;
create trigger fichas_atualizadas_em
    before update on public.fichas
    for each row execute function public.atualizar_data_ficha();

alter table public.fichas enable row level security;

-- Somente pessoas autenticadas podem operar na tabela.
-- Não concedemos UPDATE sobre usuario_id: a propriedade nunca é transferida pelo cliente.
revoke all on table public.fichas from anon, authenticated;
grant select, delete on table public.fichas to authenticated;
grant insert (usuario_id, titulo, dados) on table public.fichas to authenticated;
grant update (titulo, dados) on table public.fichas to authenticated;

drop policy if exists fichas_ler_proprias on public.fichas;
create policy fichas_ler_proprias on public.fichas
    for select to authenticated using (usuario_id = (select auth.uid()));

drop policy if exists fichas_criar_proprias on public.fichas;
create policy fichas_criar_proprias on public.fichas
    for insert to authenticated with check (usuario_id = (select auth.uid()));

drop policy if exists fichas_editar_proprias on public.fichas;
create policy fichas_editar_proprias on public.fichas
    for update to authenticated
    using (usuario_id = (select auth.uid()))
    with check (usuario_id = (select auth.uid()));

drop policy if exists fichas_excluir_proprias on public.fichas;
create policy fichas_excluir_proprias on public.fichas
    for delete to authenticated using (usuario_id = (select auth.uid()));

-- Preparação para futuras permissões de mestres e jogadores.
-- Esta tabela permanece SEM acesso por API nesta etapa: compartilhar ainda NÃO
-- libera a ficha. Uma migração futura adicionará convites, políticas e UI.
create table if not exists public.ficha_permissoes (
    ficha_id uuid not null references public.fichas(id) on delete cascade,
    usuario_id uuid not null references auth.users(id) on delete cascade,
    papel text not null check (papel in ('leitor', 'editor')),
    created_at timestamptz not null default now(),
    primary key (ficha_id, usuario_id)
);

create index if not exists ficha_permissoes_usuario_idx
    on public.ficha_permissoes (usuario_id);

alter table public.ficha_permissoes enable row level security;
revoke all on table public.ficha_permissoes from anon, authenticated;
