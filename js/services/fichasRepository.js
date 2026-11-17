/**
 * A segurança de acesso está nas políticas RLS do PostgreSQL, não no navegador.
 * Esta camada só conhece operações de fichas; não conhece a interface ou o JSON.
 */
export function criarRepositorioFichas(supabase) {
    function ordenarChaves(valor) {
        if (Array.isArray(valor))
            return valor.map(ordenarChaves);
        if (valor && typeof valor === 'object')
            return Object.fromEntries(Object.keys(valor).sort().map((chave) => [chave, ordenarChaves(valor[chave])]));
        return valor;
    }

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
        async criarImportada(usuarioId, titulo, dados, identidade) {
            async function localizar() {
                return exigir(supabase.from('fichas')
                    .select('id, titulo, updated_at')
                    .eq('origem_importacao', identidade).maybeSingle());
            }

            const existente = await localizar();
            if (existente)
                return { registro: existente, duplicada: true };

            // Exportar uma ficha já existente na mesma conta e importá-la de
            // volta também não deve gerar um segundo personagem no banco.
            const referencia = identidade.startsWith('id:') ? identidade.slice(3) : '';
            if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(referencia)) {
                const fichaOriginal = await exigir(supabase.from('fichas')
                    .select('id, titulo, updated_at').eq('id', referencia).maybeSingle());
                if (fichaOriginal)
                    return { registro: fichaOriginal, duplicada: true };
            }

            // Fichas que já estavam no banco antes da migração não têm origem.
            // Compara o JSON de registros com o mesmo título sem modificá-los.
            const candidatas = await exigir(supabase.from('fichas')
                .select('id, titulo, updated_at, dados').eq('titulo', titulo));
            const conteudo = JSON.stringify(ordenarChaves(dados));
            const anterior = candidatas.find((ficha) =>
                JSON.stringify(ordenarChaves(ficha.dados)) === conteudo);
            if (anterior)
                return { registro: anterior, duplicada: true };

            const resultado = await supabase.from('fichas')
                .insert({ usuario_id: usuarioId, titulo, dados, origem_importacao: identidade })
                .select('id, titulo, updated_at').single();

            if (!resultado.error)
                return { registro: resultado.data, duplicada: false };

            if (resultado.error.code === '23505') {
                const importada = await localizar();
                if (importada)
                    return { registro: importada, duplicada: true };
            }
            throw new Error(resultado.error.message);
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
