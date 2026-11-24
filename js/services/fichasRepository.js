import { serializarOrdenado } from '../core/serializacao.js?v=1.4.18';

/**
 * Operações da tabela fichas. O Supabase aplica as políticas de acesso do PostgreSQL.
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
        async criarImportada(usuarioId, titulo, dados, identidade, identidadeAnterior) {
            function localizar(origem) {
                return exigir(supabase.from('fichas')
                    .select('id, titulo, updated_at')
                    .eq('usuario_id', usuarioId).eq('origem_importacao', origem).maybeSingle());
            }

            const existente = await localizar(identidade)
                || (identidadeAnterior && await localizar(identidadeAnterior));
            if (existente)
                return { registro: existente, duplicada: true };

            // Exportar uma ficha já existente na mesma conta e importá-la de
            // volta também não deve gerar um segundo personagem no banco.
            const referencia = identidade.startsWith('id:') ? identidade.slice(3) : '';
            if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(referencia)) {
                const fichaOriginal = await exigir(supabase.from('fichas')
                    .select('id, titulo, updated_at').eq('usuario_id', usuarioId).eq('id', referencia).maybeSingle());
                if (fichaOriginal)
                    return { registro: fichaOriginal, duplicada: true };
            }

            // Fichas que já estavam no banco antes da migração não têm origem.
            // Compara o JSON de registros com o mesmo título sem modificá-los.
            const candidatas = await exigir(supabase.from('fichas')
                .select('id, titulo, updated_at, dados').eq('usuario_id', usuarioId).eq('titulo', titulo));
            const conteudo = serializarOrdenado(dados);
            const anterior = candidatas.find((ficha) =>
                serializarOrdenado(ficha.dados) === conteudo);
            if (anterior)
                return { registro: anterior, duplicada: true };

            const resultado = await supabase.from('fichas')
                .insert({ usuario_id: usuarioId, titulo, dados, origem_importacao: identidade })
                .select('id, titulo, updated_at').single();

            if (!resultado.error)
                return { registro: resultado.data, duplicada: false };

            if (resultado.error.code === '23505') {
                const importada = await localizar(identidade);
                if (importada)
                    return { registro: importada, duplicada: true };
            }
            throw new Error(resultado.error.message);
        },
        async salvar(id, dados, revisao) {
            if (!revisao) throw new Error('Revisão da ficha indisponível; reabra a ficha antes de salvar.');
            // A comparação e a gravação acontecem na mesma requisição UPDATE.
            // A revisão muda a cada gravação, mesmo sem trigger no PostgreSQL.
            const { data, error } = await supabase.from('fichas')
                .update({ dados, updated_at: new Date().toISOString() })
                .eq('id', id).eq('updated_at', revisao)
                .select('id, updated_at').maybeSingle();
            if (error) throw new Error(error.message);
            if (!data) {
                const conflito = new Error('A ficha foi modificada em outro dispositivo. O rascunho local foi preservado. Exporte seu JSON e confira a versão online antes de continuar.');
                conflito.code = 'FICHA_EM_CONFLITO';
                throw conflito;
            }
            return data;
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
