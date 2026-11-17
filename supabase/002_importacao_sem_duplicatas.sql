-- Executar uma vez no SQL Editor do Supabase já configurado.
-- Mantém intactas todas as fichas e imagens atualmente armazenadas.

alter table public.fichas
    add column if not exists origem_importacao text;

-- UNIQUE permite várias fichas sem origem (NULL), mas bloqueia importar a
-- mesma identidade duas vezes na mesma conta, inclusive em cliques simultâneos.
create unique index if not exists fichas_importacao_unica_por_usuario
    on public.fichas (usuario_id, origem_importacao);

-- O navegador informa a origem na criação, mas não pode alterá-la depois.
grant insert (origem_importacao) on table public.fichas to authenticated;
