/**
 * Configuração PÚBLICA do projeto Supabase.
 * Preencha URL e chave publishable (ou anon). Nunca coloque service_role ou
 * segredos do Google neste arquivo, pois ele é servido pelo navegador.
 */
export const SUPABASE = Object.freeze({
    url: '',
    publishableKey: '',
});

export function supabaseConfigurado() {
    return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(SUPABASE.url.trim())
        && /^(sb_publishable_|eyJ)/.test(SUPABASE.publishableKey.trim());
}
