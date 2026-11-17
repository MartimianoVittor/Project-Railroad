export const SUPABASE = Object.freeze({
    url: 'https://cltrtjgdobzncopstsfb.supabase.co',
    publishableKey: 'sb_publishable_H953s9tjkVJ_HL8I8GbAlw_hixTSP0X',
});

export function supabaseConfigurado() {
    return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(SUPABASE.url.trim())
        && /^(sb_publishable_|eyJ)/.test(SUPABASE.publishableKey.trim());
}
