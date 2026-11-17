/**
 * Solicitações de mesa e fichas enviadas são manipuladas somente por RPCs.
 * O banco valida auth.uid() e a propriedade de cada ficha em todas as ações.
 */
export function criarRepositorioMesas(supabase) {
    async function chamar(nome, parametros) {
        const { data, error } = await supabase.rpc(nome, parametros);
        if (error) throw new Error(error.message);
        return data;
    }

    return {
        listarConvites: () => chamar('listar_convites_jogador'),
        responderConvite: (conviteId, aceitar) => chamar('responder_convite_mesa', {
            p_convite_id: conviteId,
            p_aceitar: aceitar,
        }),
        listarFichasEnviadas: (conviteId) => chamar('listar_fichas_enviadas_mesa', {
            p_convite_id: conviteId,
        }),
        enviarFicha: (conviteId, fichaId) => chamar('enviar_ficha_mesa', {
            p_convite_id: conviteId,
            p_ficha_id: fichaId,
        }),
        retirarFicha: (envioId) => chamar('retirar_ficha_mesa', {
            p_envio_id: envioId,
        }),
    };
}
