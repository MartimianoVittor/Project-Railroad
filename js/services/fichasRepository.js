/**
 * A segurança de acesso está nas políticas RLS do PostgreSQL, não no navegador.
 * Esta camada só conhece operações de fichas; não conhece a interface ou o JSON.
 */
export function criarRepositorioFichas(supabase) {
    async function exigir(resultado) {
        const { data, error } = await resultado;
        if (error)
            throw new Error(error.message);
        return data;
    }

    return {
        listar() {
            return exigir(supabase.from('fichas')
                .select('id, titulo, created_at, updated_at')
                .order('updated_at', { ascending: false }));
        },
        obter(id) {
            return exigir(supabase.from('fichas')
                .select('id, titulo, dados, updated_at')
                .eq('id', id).single());
        },
        criar(usuarioId, titulo, dados) {
            return exigir(supabase.from('fichas')
                .insert({ usuario_id: usuarioId, titulo, dados })
                .select('id, titulo, updated_at').single());
        },
        salvar(id, dados) {
            return exigir(supabase.from('fichas')
                .update({ dados }).eq('id', id)
                .select('id, updated_at').single());
        },
        renomear(id, titulo) {
            return exigir(supabase.from('fichas')
                .update({ titulo }).eq('id', id)
                .select('id, titulo').single());
        },
        excluir(id) {
            return exigir(supabase.from('fichas')
                .delete().eq('id', id)
                .select('id').single());
        },
    };
}
