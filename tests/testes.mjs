import assert from 'node:assert/strict';
import { normalizarFicha } from '../js/core/validacao.js';
import { criarRepositorioLocal } from '../js/services/fichasLocais.js';
import { identidadeDaImportacao } from '../js/services/identidadeImportacao.js';

const memoria = new Map();
const armazenamento = {
    getItem: (chave) => memoria.get(chave) ?? null,
    setItem: (chave, valor) => memoria.set(chave, String(valor)),
    removeItem: (chave) => memoria.delete(chave),
};

const locais = criarRepositorioLocal(armazenamento);
const dadosAntigos = normalizarFicha({
    personagem: { 'nome-personagem': 'Forasteiro antigo' },
    inventario: { itens: [{ nome: 'Corda', local: 'montaria' }] },
});
armazenamento.setItem('railroad_rpg_ficha', JSON.stringify(dadosAntigos));
locais.migrarAntiga(normalizarFicha);
assert.equal(locais.listar().length, 1, 'migrou a ficha antiga uma vez');
assert.equal(locais.obter(locais.ativa()).dados.inventario.itens[0].local, 'montaria');
locais.migrarAntiga(normalizarFicha);
assert.equal(locais.listar().length, 1, 'migração idempotente');

const outra = locais.criar('Outra ficha', normalizarFicha({ personagem: { 'nome-personagem': 'Segunda' } }));
assert.equal(locais.listar().length, 2, 'permite vários personagens locais');
locais.salvar(outra.id, normalizarFicha({ personagem: { 'nome-personagem': 'Segunda editada' } }));
assert.equal(locais.obter(outra.id).dados.personagem['nome-personagem'], 'Segunda editada');
locais.renomear(outra.id, 'Renomeada');
assert.equal(locais.obter(outra.id).titulo, 'Renomeada');
locais.excluir(outra.id);
assert.equal(locais.listar().length, 1);

for (const local of ['jogador', 'montaria', '']) {
    const ficha = normalizarFicha({ inventario: { itens: [{ local }] } });
    assert.equal(ficha.inventario.itens[0].local, local);
}

const origem = await identidadeDaImportacao(dadosAntigos);
assert.equal(origem, await identidadeDaImportacao(structuredClone(dadosAntigos)), 'mesmo JSON, mesmo hash');
assert.notEqual(origem, await identidadeDaImportacao(normalizarFicha({ personagem: { 'nome-personagem': 'Outro' } })));
assert.equal(await identidadeDaImportacao({ ...dadosAntigos, railroadId: 'ficha_12345678' }), 'id:ficha_12345678');

console.log('OK: fichas locais, migração legada, exclusão local e identidade de importações.');
