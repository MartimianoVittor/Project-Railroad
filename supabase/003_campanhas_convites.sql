-- RAILROAD · ETAPA DE CAMPANHAS (Jogador v1.1.0 / Mestre futura atualização)
-- Execute no projeto Supabase já utilizado pelo Railroad v1.0.0.
-- Dependências: 001_fichas_privadas.sql e 002_importacao_sem_duplicatas.sql.
-- Não depende da migração 003; ambas podem coexistir.
-- Migração ADITIVA: não altera, remove ou transfere fichas existentes.

begin;

create table if not exists public.campanhas (
    id uuid primary key default gen_random_uuid(),
    mestre_id uuid not null references auth.users(id) on delete cascade,
    nome text not null check (char_length(trim(nome)) between 1 and 120),
    created_at timestamptz not null default now()
);

create table if not exists public.campanha_convites (
    id uuid primary key default gen_random_uuid(),
    campanha_id uuid not null references public.campanhas(id) on delete cascade,
    jogador_id uuid not null references auth.users(id) on delete cascade,
    status text not null default 'pendente'
        check (status in ('pendente', 'aceito', 'recusado')),
    created_at timestamptz not null default now(),
    respondido_em timestamptz,
    unique (campanha_id, jogador_id)
);

create table if not exists public.campanha_fichas (
    id uuid primary key default gen_random_uuid(),
    campanha_id uuid not null references public.campanhas(id) on delete cascade,
    convite_id uuid not null references public.campanha_convites(id) on delete cascade,
    ficha_id uuid not null references public.fichas(id) on delete cascade,
    status text not null default 'pendente'
        check (status in ('pendente', 'aprovada', 'recusada')),
    created_at timestamptz not null default now(),
    decidido_em timestamptz,
    unique (campanha_id, ficha_id)
);

create index if not exists convites_jogador_status_idx
    on public.campanha_convites (jogador_id, status);
create index if not exists convites_campanha_idx
    on public.campanha_convites (campanha_id);
create index if not exists envios_campanha_status_idx
    on public.campanha_fichas (campanha_id, status);
create index if not exists envios_ficha_status_idx
    on public.campanha_fichas (ficha_id, status);

-- Todas as operações passam por funções que validam auth.uid() no servidor.
-- Não há acesso direto a essas três tabelas pela Data API.
alter table public.campanhas enable row level security;
alter table public.campanha_convites enable row level security;
alter table public.campanha_fichas enable row level security;
revoke all on table public.campanhas from anon, authenticated;
revoke all on table public.campanha_convites from anon, authenticated;
revoke all on table public.campanha_fichas from anon, authenticated;

create schema if not exists railroad_private;
revoke all on schema railroad_private from public, anon;
grant usage on schema railroad_private to authenticated;

-- O mestre só lê fichas cujos convites foram aceitos e os envios ainda estão
-- pendentes ou aprovados. Rejeitar/remover um envio revoga essa via de leitura.
-- Definer fora do schema exposto evita políticas RLS mutuamente recursivas.
create or replace function railroad_private.mestre_pode_ler_ficha(p_ficha_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
    select exists (
        select 1
        from public.campanha_fichas as envio
        join public.campanhas as campanha on campanha.id = envio.campanha_id
        join public.campanha_convites as convite on convite.id = envio.convite_id
        join public.fichas as ficha on ficha.id = envio.ficha_id
        where envio.ficha_id = p_ficha_id
            and convite.campanha_id = campanha.id
            and convite.jogador_id = ficha.usuario_id
            and campanha.mestre_id = (select auth.uid())
            and convite.status = 'aceito'
            and envio.status in ('pendente', 'aprovada')
    );
$$;

drop policy if exists fichas_ler_em_campanhas on public.fichas;
create policy fichas_ler_em_campanhas on public.fichas
    for select to authenticated
    using (railroad_private.mestre_pode_ler_ficha(id));

-- ========== OPERAÇÕES DO JOGADOR ==========

create or replace function railroad_private.listar_convites_jogador()
returns table (
    convite_id uuid, campanha_id uuid, campanha_nome text, mestre_id uuid,
    status text, convidado_em timestamptz, respondido_em timestamptz
)
language sql stable security definer set search_path = ''
as $$
    select convite.id, campanha.id, campanha.nome, campanha.mestre_id,
           convite.status, convite.created_at, convite.respondido_em
    from public.campanha_convites as convite
    join public.campanhas as campanha on campanha.id = convite.campanha_id
    where convite.jogador_id = (select auth.uid())
    order by convite.created_at desc;
$$;

create or replace function railroad_private.responder_convite_mesa(
    p_convite_id uuid, p_aceitar boolean
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
    if (select auth.uid()) is null or p_aceitar is null then
        raise exception 'Entre com Google e escolha uma resposta.';
    end if;

    update public.campanha_convites
    set status = case when p_aceitar then 'aceito' else 'recusado' end,
        respondido_em = now()
    where id = p_convite_id
        and jogador_id = (select auth.uid())
        and status = 'pendente';

    if not found then
        raise exception 'Convite inexistente, já respondido ou de outra conta.';
    end if;
end;
$$;

create or replace function railroad_private.listar_fichas_enviadas_mesa(p_convite_id uuid)
returns table (
    envio_id uuid, ficha_id uuid, titulo text, status text, enviado_em timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
    if not exists (
        select 1 from public.campanha_convites as c
        where c.id = p_convite_id and c.jogador_id = (select auth.uid())
    ) then
        raise exception 'Este convite não pertence à sua conta.';
    end if;

    return query
        select envio.id, ficha.id, ficha.titulo, envio.status, envio.created_at
        from public.campanha_fichas as envio
        join public.fichas as ficha on ficha.id = envio.ficha_id
        where envio.convite_id = p_convite_id
            and ficha.usuario_id = (select auth.uid())
        order by envio.created_at desc;
end;
$$;

create or replace function railroad_private.enviar_ficha_mesa(
    p_convite_id uuid, p_ficha_id uuid
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
    v_campanha_id uuid;
    v_envio_id uuid;
begin
    select convite.campanha_id into v_campanha_id
    from public.campanha_convites as convite
    where convite.id = p_convite_id
        and convite.jogador_id = (select auth.uid())
        and convite.status = 'aceito';

    if v_campanha_id is null then
        raise exception 'Aceite primeiro o convite da mesa.';
    end if;
    if not exists (
        select 1 from public.fichas as ficha
        where ficha.id = p_ficha_id and ficha.usuario_id = (select auth.uid())
    ) then
        raise exception 'A ficha escolhida não pertence à sua conta.';
    end if;

    insert into public.campanha_fichas (campanha_id, convite_id, ficha_id)
    values (v_campanha_id, p_convite_id, p_ficha_id)
    on conflict (campanha_id, ficha_id) do nothing
    returning id into v_envio_id;

    if v_envio_id is null then
        raise exception 'Esta ficha já foi enviada para esta campanha.';
    end if;
    return v_envio_id;
end;
$$;

create or replace function railroad_private.retirar_ficha_mesa(p_envio_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
    delete from public.campanha_fichas as envio
    using public.campanha_convites as convite
    where envio.id = p_envio_id
        and convite.id = envio.convite_id
        and convite.jogador_id = (select auth.uid());

    if not found then
        raise exception 'Envio inexistente ou não pertence à sua conta.';
    end if;
end;
$$;

-- ========== OPERAÇÕES DO MESTRE (PARA A ETAPA SEGUINTE) ==========

create or replace function railroad_private.criar_campanha_mestre(p_nome text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
    v_id uuid;
begin
    if (select auth.uid()) is null or char_length(trim(coalesce(p_nome, ''))) not between 1 and 120 then
        raise exception 'Informe um nome de campanha de 1 a 120 caracteres.';
    end if;
    insert into public.campanhas (mestre_id, nome)
    values ((select auth.uid()), trim(p_nome)) returning id into v_id;
    return v_id;
end;
$$;

create or replace function railroad_private.listar_campanhas_mestre()
returns table (campanha_id uuid, nome text, criada_em timestamptz)
language sql stable security definer set search_path = ''
as $$
    select campanha.id, campanha.nome, campanha.created_at
    from public.campanhas as campanha
    where campanha.mestre_id = (select auth.uid())
    order by campanha.created_at desc;
$$;

create or replace function railroad_private.convidar_jogador_mesa(
    p_campanha_id uuid, p_jogador_id uuid
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
    v_id uuid;
begin
    if not exists (
        select 1 from public.campanhas as campanha
        where campanha.id = p_campanha_id and campanha.mestre_id = (select auth.uid())
    ) then
        raise exception 'Campanha não encontrada ou não pertence à sua conta.';
    end if;
    if p_jogador_id = (select auth.uid()) then
        raise exception 'Utilize a conta de outro jogador para um convite.';
    end if;
    if not exists (select 1 from auth.users as usuario where usuario.id = p_jogador_id) then
        raise exception 'Código do jogador não encontrado. Ele precisa entrar com Google primeiro.';
    end if;

    insert into public.campanha_convites (campanha_id, jogador_id)
    values (p_campanha_id, p_jogador_id)
    on conflict (campanha_id, jogador_id) do update
        set status = case when campanha_convites.status = 'recusado'
                          then 'pendente' else campanha_convites.status end,
            respondido_em = case when campanha_convites.status = 'recusado'
                                then null else campanha_convites.respondido_em end
    returning id into v_id;
    return v_id;
end;
$$;

create or replace function railroad_private.listar_convites_mestre(p_campanha_id uuid)
returns table (convite_id uuid, jogador_id uuid, status text, convidado_em timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
    if not exists (
        select 1 from public.campanhas as campanha
        where campanha.id = p_campanha_id and campanha.mestre_id = (select auth.uid())
    ) then
        raise exception 'Campanha não encontrada ou não pertence à sua conta.';
    end if;

    return query
        select convite.id, convite.jogador_id, convite.status, convite.created_at
        from public.campanha_convites as convite
        where convite.campanha_id = p_campanha_id
        order by convite.created_at desc;
end;
$$;

create or replace function railroad_private.listar_fichas_campanha_mestre(p_campanha_id uuid)
returns table (
    envio_id uuid, ficha_id uuid, jogador_id uuid, titulo text,
    status text, enviado_em timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
    if not exists (
        select 1 from public.campanhas as campanha
        where campanha.id = p_campanha_id and campanha.mestre_id = (select auth.uid())
    ) then
        raise exception 'Campanha não encontrada ou não pertence à sua conta.';
    end if;

    return query
        select envio.id, ficha.id, convite.jogador_id, ficha.titulo,
               envio.status, envio.created_at
        from public.campanha_fichas as envio
        join public.campanha_convites as convite on convite.id = envio.convite_id
        join public.fichas as ficha on ficha.id = envio.ficha_id
        where envio.campanha_id = p_campanha_id
            and convite.campanha_id = p_campanha_id
            and convite.status = 'aceito'
            and ficha.usuario_id = convite.jogador_id
        order by envio.created_at desc;
end;
$$;

create or replace function railroad_private.decidir_ficha_campanha(
    p_envio_id uuid, p_aprovar boolean
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
    if p_aprovar is null then raise exception 'Informe se a ficha foi aprovada.'; end if;

    update public.campanha_fichas as envio
    set status = case when p_aprovar then 'aprovada' else 'recusada' end,
        decidido_em = now()
    from public.campanhas as campanha, public.campanha_convites as convite
    where envio.id = p_envio_id
        and campanha.id = envio.campanha_id
        and campanha.mestre_id = (select auth.uid())
        and convite.id = envio.convite_id
        and convite.status = 'aceito'
        and envio.status = 'pendente';

    if not found then
        raise exception 'Ficha não pendente ou sem autorização para aprovação.';
    end if;
end;
$$;

create or replace function railroad_private.remover_ficha_campanha(p_envio_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
    delete from public.campanha_fichas as envio
    using public.campanhas as campanha
    where envio.id = p_envio_id
        and campanha.id = envio.campanha_id
        and campanha.mestre_id = (select auth.uid());

    if not found then
        raise exception 'Envio não encontrado ou de outra campanha.';
    end if;
end;
$$;

-- ========== WRAPPERS PÚBLICOS E PRIVILÉGIOS ==========
-- Os wrappers public são SECURITY INVOKER. O acesso às tabelas protegidas é
-- feito somente nas funções verificadoras do schema não exposto.

create or replace function public.listar_convites_jogador()
returns table (
    convite_id uuid, campanha_id uuid, campanha_nome text, mestre_id uuid,
    status text, convidado_em timestamptz, respondido_em timestamptz
)
language sql security invoker set search_path = ''
as $$ select * from railroad_private.listar_convites_jogador(); $$;

create or replace function public.responder_convite_mesa(p_convite_id uuid, p_aceitar boolean)
returns void language sql security invoker set search_path = ''
as $$ select railroad_private.responder_convite_mesa(p_convite_id, p_aceitar); $$;

create or replace function public.listar_fichas_enviadas_mesa(p_convite_id uuid)
returns table (envio_id uuid, ficha_id uuid, titulo text, status text, enviado_em timestamptz)
language sql security invoker set search_path = ''
as $$ select * from railroad_private.listar_fichas_enviadas_mesa(p_convite_id); $$;

create or replace function public.enviar_ficha_mesa(p_convite_id uuid, p_ficha_id uuid)
returns uuid language sql security invoker set search_path = ''
as $$ select railroad_private.enviar_ficha_mesa(p_convite_id, p_ficha_id); $$;

create or replace function public.retirar_ficha_mesa(p_envio_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select railroad_private.retirar_ficha_mesa(p_envio_id); $$;

create or replace function public.criar_campanha_mestre(p_nome text)
returns uuid language sql security invoker set search_path = ''
as $$ select railroad_private.criar_campanha_mestre(p_nome); $$;

create or replace function public.listar_campanhas_mestre()
returns table (campanha_id uuid, nome text, criada_em timestamptz)
language sql security invoker set search_path = ''
as $$ select * from railroad_private.listar_campanhas_mestre(); $$;

create or replace function public.convidar_jogador_mesa(p_campanha_id uuid, p_jogador_id uuid)
returns uuid language sql security invoker set search_path = ''
as $$ select railroad_private.convidar_jogador_mesa(p_campanha_id, p_jogador_id); $$;

create or replace function public.listar_convites_mestre(p_campanha_id uuid)
returns table (convite_id uuid, jogador_id uuid, status text, convidado_em timestamptz)
language sql security invoker set search_path = ''
as $$ select * from railroad_private.listar_convites_mestre(p_campanha_id); $$;

create or replace function public.listar_fichas_campanha_mestre(p_campanha_id uuid)
returns table (
    envio_id uuid, ficha_id uuid, jogador_id uuid, titulo text,
    status text, enviado_em timestamptz
)
language sql security invoker set search_path = ''
as $$ select * from railroad_private.listar_fichas_campanha_mestre(p_campanha_id); $$;

create or replace function public.decidir_ficha_campanha(p_envio_id uuid, p_aprovar boolean)
returns void language sql security invoker set search_path = ''
as $$ select railroad_private.decidir_ficha_campanha(p_envio_id, p_aprovar); $$;

create or replace function public.remover_ficha_campanha(p_envio_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select railroad_private.remover_ficha_campanha(p_envio_id); $$;

-- Todas as 12 funções têm privilégios explícitos. Função de política RLS
-- não é exposta por RPC e somente pode ser avaliada como usuário autenticado.
revoke execute on all functions in schema railroad_private from public, anon;
grant execute on function railroad_private.mestre_pode_ler_ficha(uuid) to authenticated;

revoke execute on function public.listar_convites_jogador() from public, anon;
revoke execute on function public.responder_convite_mesa(uuid, boolean) from public, anon;
revoke execute on function public.listar_fichas_enviadas_mesa(uuid) from public, anon;
revoke execute on function public.enviar_ficha_mesa(uuid, uuid) from public, anon;
revoke execute on function public.retirar_ficha_mesa(uuid) from public, anon;
revoke execute on function public.criar_campanha_mestre(text) from public, anon;
revoke execute on function public.listar_campanhas_mestre() from public, anon;
revoke execute on function public.convidar_jogador_mesa(uuid, uuid) from public, anon;
revoke execute on function public.listar_convites_mestre(uuid) from public, anon;
revoke execute on function public.listar_fichas_campanha_mestre(uuid) from public, anon;
revoke execute on function public.decidir_ficha_campanha(uuid, boolean) from public, anon;
revoke execute on function public.remover_ficha_campanha(uuid) from public, anon;

grant execute on function railroad_private.listar_convites_jogador() to authenticated;
grant execute on function railroad_private.responder_convite_mesa(uuid, boolean) to authenticated;
grant execute on function railroad_private.listar_fichas_enviadas_mesa(uuid) to authenticated;
grant execute on function railroad_private.enviar_ficha_mesa(uuid, uuid) to authenticated;
grant execute on function railroad_private.retirar_ficha_mesa(uuid) to authenticated;
grant execute on function railroad_private.criar_campanha_mestre(text) to authenticated;
grant execute on function railroad_private.listar_campanhas_mestre() to authenticated;
grant execute on function railroad_private.convidar_jogador_mesa(uuid, uuid) to authenticated;
grant execute on function railroad_private.listar_convites_mestre(uuid) to authenticated;
grant execute on function railroad_private.listar_fichas_campanha_mestre(uuid) to authenticated;
grant execute on function railroad_private.decidir_ficha_campanha(uuid, boolean) to authenticated;
grant execute on function railroad_private.remover_ficha_campanha(uuid) to authenticated;

grant execute on function public.listar_convites_jogador() to authenticated;
grant execute on function public.responder_convite_mesa(uuid, boolean) to authenticated;
grant execute on function public.listar_fichas_enviadas_mesa(uuid) to authenticated;
grant execute on function public.enviar_ficha_mesa(uuid, uuid) to authenticated;
grant execute on function public.retirar_ficha_mesa(uuid) to authenticated;
grant execute on function public.criar_campanha_mestre(text) to authenticated;
grant execute on function public.listar_campanhas_mestre() to authenticated;
grant execute on function public.convidar_jogador_mesa(uuid, uuid) to authenticated;
grant execute on function public.listar_convites_mestre(uuid) to authenticated;
grant execute on function public.listar_fichas_campanha_mestre(uuid) to authenticated;
grant execute on function public.decidir_ficha_campanha(uuid, boolean) to authenticated;
grant execute on function public.remover_ficha_campanha(uuid) to authenticated;

commit;
