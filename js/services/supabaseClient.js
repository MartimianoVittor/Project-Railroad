import { SUPABASE, supabaseConfigurado } from '../config/supabase.js?v=1.4.19';

let clientePromise;

/** Carrega a biblioteca somente depois que o projeto for configurado. */
export function obterSupabase() {
    if (!supabaseConfigurado())
        return Promise.resolve(null);

    clientePromise ??= import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm')
        .then(({ createClient }) => createClient(
            SUPABASE.url.trim(),
            SUPABASE.publishableKey.trim(),
            { auth: { storageKey: 'railroad-jogador-auth-v1', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
        ))
        .catch((erro) => {
            clientePromise = null;
            throw erro;
        });

    return clientePromise;
}
