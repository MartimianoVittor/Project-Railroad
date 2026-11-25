import { serializarOrdenado } from '../core/serializacao.js?v=1.4.23';

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

    async function executarRpc(nome, parametros) {
        const { data, error } = await supabase.rpc(nome, parametros);
        if (error) {
            if (/^conflito:/i.test(error.message || '')) {
                const conflito = new Error(`${error.message} Exporte o JSON local antes de reabrir.`);
                conflito.code = 'FICHA_EM_CONFLITO';
                throw conflito;
            }
            const falha = new Error(error.message || 'Falha ao salvar ficha no Supabase.');
            falha.code = error.code;
            throw falha;
        }
        const registro = Array.isArray(data) ? data[0] : data;
        const revisao = Number(registro?.revisao);
        if (!registro || !Number.isSafeInteger(revisao) || revisao < 1)
            throw new Error('O Supabase não confirmou a nova revisão da ficha. Rascunho preservado.');
        return { ...registro, revisao };
    }

    return {
        listar() {
            return exigir(supabase.from('fichas')
                .select('id, titulo, created_at, updated_at, revisao')
                .order('updated_at', { ascending: false }));
        },
        obter(id) {
            return exigir(supabase.from('fichas')
                .select('id, titulo, dados, updated_at, revisao')
                .eq('id', id).single());
        },
        criar(usuarioId, titulo, dados) {
            return exigir(supabase.from('fichas')
                .insert({ usuario_id: usuarioId, titulo, dados })
                .select('id, titulo, updated_at, revisao').single());
        },
        async criarImportada(usuarioId, titulo, dados, identidade, identidadeAnterior) {
            function localizar(origem) {
                return exigir(supabase.from('fichas')
                    .select('id, titulo, updated_at, revisao')
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
                    .select('id, titulo, updated_at, revisao').eq('usuario_id', usuarioId).eq('id', referencia).maybeSingle());
                if (fichaOriginal)
                    return { registro: fichaOriginal, duplicada: true };
            }

            // Fichas que já estavam no banco antes da migração não têm origem.
            // Compara o JSON de registros com o mesmo título sem modificá-los.
            const candidatas = await exigir(supabase.from('fichas')
                .select('id, titulo, updated_at, revisao, dados').eq('usuario_id', usuarioId).eq('titulo', titulo));
            const conteudo = serializarOrdenado(dados);
            const anterior = candidatas.find((ficha) =>
                serializarOrdenado(ficha.dados) === conteudo);
            if (anterior)
                return { registro: anterior, duplicada: true };

            const resultado = await supabase.from('fichas')
                .insert({ usuario_id: usuarioId, titulo, dados, origem_importacao: identidade })
                .select('id, titulo, updated_at, revisao').single();

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
            if (!Number.isSafeInteger(revisao) || revisao < 1)
                throw new Error('Revisão da ficha indisponível; reabra a ficha antes de salvar.');
            return executarRpc('salvar_ficha_jogador', {
                p_ficha_id: id, p_dados: dados, p_revisao: revisao,
            });
        },
        async renomear(id, titulo, revisao) {
            if (!Number.isSafeInteger(revisao) || revisao < 1)
                throw new Error('Revisão da ficha indisponível; atualize a lista antes de renomear.');
            return executarRpc('renomear_ficha_jogador', {
                p_ficha_id: id, p_titulo: titulo, p_revisao: revisao,
            });
        },
        excluir(id) {
            return exigir(supabase.from('fichas')
                .delete().eq('id', id)
                .select('id').single());
        },
    };
}
