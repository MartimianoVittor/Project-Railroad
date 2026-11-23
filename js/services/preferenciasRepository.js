/** Persistência de aparência por conta; a autorização é aplicada pelo RLS. */
export function criarRepositorioPreferencias(cliente) {
    return {
        async carregar(usuarioId) {
            const { data, error } = await cliente.from('preferencias_visuais')
                .select('preferencias').eq('usuario_id', usuarioId).maybeSingle();
            if (error) throw error;
            return data?.preferencias ?? null;
        },
        async salvar(usuarioId, preferencias) {
            const { error } = await cliente.from('preferencias_visuais').upsert({
                usuario_id: usuarioId, preferencias, atualizado_em: new Date().toISOString(),
            }, { onConflict: 'usuario_id' });
            if (error) throw error;
        },
    };
}
