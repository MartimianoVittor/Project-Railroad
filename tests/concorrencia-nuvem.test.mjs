import test from 'node:test';
import assert from 'node:assert/strict';
import { criarRepositorioFichas } from '../js/services/fichasRepository.js';

// Simula UPDATE ... WHERE id = ? AND updated_at = ?
function supabaseDeTeste() {
    let dados = { id: 'x', updated_at: '2026-10-01T10:00:00.000Z', dados: { valor: 1 } };
    return {
        atualizarExternamente() { dados.updated_at = '2026-10-02T10:00:00.000Z'; },
        from(tabela) {
            assert.equal(tabela, 'fichas');
            const condicoes = {};
            let alteracao;
            const consulta = {
                update(valor) { alteracao = valor; return consulta; },
                eq(chave, valor) { condicoes[chave] = valor; return consulta; },
                select(campos) { assert.match(campos, /updated_at/); return consulta; },
                async maybeSingle() {
                    if (condicoes.id !== dados.id || condicoes.updated_at !== dados.updated_at)
                        return { data: null, error: null };
                    dados = { ...dados, ...alteracao };
                    return { data: dados, error: null };
                },
            };
            return consulta;
        },
    };
}
test('a revisão otimista impede substituição silenciosa de uma ficha editada em outra sessão', async () => {
    const remoto = supabaseDeTeste();
    const repo = criarRepositorioFichas(remoto);
    await assert.rejects(repo.salvar('x', { valor: 2 }), /Revisão/);
    remoto.atualizarExternamente();
    await assert.rejects(repo.salvar('x', { valor: 2 }, '2026-10-01T10:00:00.000Z'),
        (erro) => erro.code === 'FICHA_EM_CONFLITO');
    const resultado = await repo.salvar('x', { valor: 3 }, '2026-10-02T10:00:00.000Z');
    assert.notEqual(resultado.updated_at, '2026-10-02T10:00:00.000Z');
});
