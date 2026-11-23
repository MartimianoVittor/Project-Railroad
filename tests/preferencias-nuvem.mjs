import assert from 'node:assert/strict';
import { criarRepositorioPreferencias } from '../js/services/preferenciasRepository.js';
let gravado;
const cliente = { from(tabela) {
    assert.equal(tabela, 'preferencias_visuais');
    return {
        select(campo) { assert.equal(campo,'preferencias'); return { eq(chave,id) { assert.equal(chave,'usuario_id'); return { async maybeSingle() { return { data: gravado?.usuario_id === id ? gravado : null }; } }; } }; },
        async upsert(dados, opcoes) { assert.equal(opcoes.onConflict,'usuario_id'); gravado = dados; return {}; }
    };
} };
const repo = criarRepositorioPreferencias(cliente);
assert.equal(await repo.carregar('a'), null);
await repo.salvar('a', { borda: 'ornamental' });
assert.deepEqual(await repo.carregar('a'), { borda: 'ornamental' });
assert.equal(await repo.carregar('b'), null);
const falha = criarRepositorioPreferencias({from(){return {async upsert(){return {error:new Error('offline')};}};}});
await assert.rejects(falha.salvar('a', {}), /offline/);
console.log('OK: repositório de preferências, isolamento simulado e propagação de erro.');
