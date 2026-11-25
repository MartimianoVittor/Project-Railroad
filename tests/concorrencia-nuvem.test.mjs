import test from 'node:test';
import assert from 'node:assert/strict';
import { criarRepositorioFichas } from '../js/services/fichasRepository.js';

/** Simula o contrato das RPCs PostgreSQL: atualização condicionada à revisão. */
function supabaseDeTeste() {
    const fichas = new Map([
        ['x', { id: 'x', titulo: 'Original', revisao: 1, updated_at: '2026-10-01T10:00:00Z', dados: { valor: 1 } }],
    ]);
    let chamadas = 0;
    return {
        fichas,
        get chamadas() { return chamadas; },
        atualizarExternamente() {
            const ficha = fichas.get('x');
            ficha.dados = { valor: 25 };
            ficha.revisao++;
        },
        async rpc(nome, parametros) {
            chamadas++;
            assert.ok(['salvar_ficha_jogador', 'renomear_ficha_jogador'].includes(nome));
            const registro = fichas.get(parametros.p_ficha_id);
            if (!registro || registro.revisao !== parametros.p_revisao) return {
                data: null,
                error: { code: 'P0001', message: 'Conflito: ficha modificada em outro dispositivo.' },
            };
            if (nome === 'salvar_ficha_jogador') registro.dados = parametros.p_dados;
            else registro.titulo = parametros.p_titulo;
            registro.revisao++;
            registro.updated_at = '2026-10-02T10:00:00Z';
            return { data: [{ id: registro.id, titulo: registro.titulo, revisao: registro.revisao, updated_at: registro.updated_at }], error: null };
        },
    };
}

test('revisão numérica impede salvar documento com base desatualizada', async () => {
    const remoto = supabaseDeTeste();
    const repo = criarRepositorioFichas(remoto);
    await assert.rejects(repo.salvar('x', { valor: 2 }), /Revisão/);
    assert.equal(remoto.chamadas, 0, 'nunca envia sem a revisão lida no banco');
    remoto.atualizarExternamente();
    await assert.rejects(repo.salvar('x', { valor: 2 }, 1),
        (erro) => erro.code === 'FICHA_EM_CONFLITO');
    assert.deepEqual(remoto.fichas.get('x').dados, { valor: 25 });
    const resultado = await repo.salvar('x', { valor: 3 }, 2);
    assert.equal(resultado.revisao, 3);
    assert.deepEqual(remoto.fichas.get('x').dados, { valor: 3 });
});

test('renomear também utiliza revisão e impede sobrescrever título recente', async () => {
    const remoto = supabaseDeTeste();
    const repo = criarRepositorioFichas(remoto);
    const atualizado = await repo.renomear('x', 'Novo nome', 1);
    assert.equal(atualizado.revisao, 2);
    assert.equal(atualizado.titulo, 'Novo nome');
    await assert.rejects(repo.renomear('x', 'Nome antigo', 1),
        (erro) => erro.code === 'FICHA_EM_CONFLITO');
    assert.equal(remoto.fichas.get('x').titulo, 'Novo nome');
});

test('falha de API não é sinalizada como salvamento concluído', async () => {
    const repo = criarRepositorioFichas({
        rpc: async () => ({ data: null, error: { code: '42501', message: 'permission denied' } }),
    });
    await assert.rejects(repo.salvar('x', { personagem: {} }, 1), /permission denied/);
});


test('rascunhos antigos ou de outra revisão não podem sobrescrever a nuvem', async () => {
    const { rascunhoCompativel } = await import('../js/modules/fichas/online.js');
    assert.equal(rascunhoCompativel({ dados: {} }, 3), false, 'rascunho legado sem revisão');
    assert.equal(rascunhoCompativel({ dados: {}, revisaoBase: 2 }, 3), false);
    assert.equal(rascunhoCompativel({ dados: {}, revisaoBase: 3 }, 3), true);
});
