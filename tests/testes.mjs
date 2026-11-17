import assert from 'node:assert/strict';
import { normalizarFicha } from '../js/core/validacao.js';
import { criarRepositorioLocal } from '../js/services/fichasLocais.js';
import { identidadeDaImportacao } from '../js/services/identidadeImportacao.js';
import { criarBancoEmMemoria } from './apoioBanco.mjs';

const memoria = new Map();
const armazenamento = {
    getItem: (chave) => memoria.get(chave) ?? null,
    setItem: (chave, valor) => memoria.set(chave, String(valor)),
    removeItem: (chave) => memoria.delete(chave),
    key: (indice) => [...memoria.keys()][indice] ?? null,
    get length() { return memoria.size; },
};

const banco = criarBancoEmMemoria();
const locais = criarRepositorioLocal(armazenamento, async () => banco);
const dadosAntigos = normalizarFicha({
    personagem: { 'nome-personagem': 'Forasteiro antigo' },
    inventario: { itens: [{ nome: 'Corda', local: 'montaria' }] },
});
armazenamento.setItem('railroad_rpg_ficha', JSON.stringify(dadosAntigos));
await locais.migrarAntiga(normalizarFicha);
assert.equal(locais.listar().length, 1, 'migrou a ficha antiga uma vez');
assert.equal(locais.obter(locais.ativa()).dados.inventario.itens[0].local, 'montaria');
await locais.migrarAntiga(normalizarFicha);
assert.equal(locais.listar().length, 1, 'migração idempotente');

const outra = locais.criar('Outra ficha', normalizarFicha({ personagem: { 'nome-personagem': 'Segunda' } }));
assert.equal(locais.listar().length, 2, 'permite vários personagens locais');
locais.salvar(outra.id, normalizarFicha({ personagem: { 'nome-personagem': 'Segunda editada' } }));
assert.equal(locais.obter(outra.id).dados.personagem['nome-personagem'], 'Segunda editada');
locais.renomear(outra.id, 'Renomeada');
assert.equal(locais.obter(outra.id).titulo, 'Renomeada');
locais.excluir(outra.id);
assert.equal(locais.listar().length, 1);
await locais.flush();

const fotoGrande = 'data:image/png;base64,' + 'A'.repeat(7_000_000);
const localAntigo = { id: 'importado-local', titulo: 'Fotos grandes', dados: { foto: fotoGrande }, updatedAt: new Date().toISOString() };
armazenamento.setItem('railroad_ficha_local:importado-local', JSON.stringify(localAntigo));
armazenamento.setItem('railroad_rascunho:user:sheet', JSON.stringify({ dados: { foto: fotoGrande }, token: 'antigo' }));
await locais.migrarAntiga(normalizarFicha);
assert.equal(locais.obter('importado-local').dados.foto.length, fotoGrande.length);
assert.equal(locais.lerRascunho('user', 'sheet').dados.foto.length, fotoGrande.length);
assert.equal(armazenamento.getItem('railroad_ficha_local:importado-local'), null, 'liberou quota do localStorage');
assert.equal(armazenamento.getItem('railroad_rascunho:user:sheet'), null, 'migrou rascunho online');

locais.gravarRascunho('user', 'sheet', { marcador: true });
await locais.flush();
const reaberto = criarRepositorioLocal(armazenamento, async () => banco);
await reaberto.migrarAntiga(normalizarFicha);
assert.equal(reaberto.lerRascunho('user', 'sheet').dados.marcador, true, 'rascunho persistiu');
assert.equal(reaberto.obter('importado-local').dados.foto.length, fotoGrande.length, 'foto persistiu');
reaberto.apagarRascunho('user', 'sheet');
await reaberto.flush();
assert.equal(reaberto.lerRascunho('user', 'sheet'), null);

// Se o IndexedDB falhar, o arquivo antigo NÃO pode ser apagado do navegador.
const antigoNaoMigrado = 'railroad_ficha_local:resgate';
armazenamento.setItem(antigoNaoMigrado, JSON.stringify({
    id: 'resgate', titulo: 'Resgate', dados: { foto: fotoGrande }, updatedAt: new Date().toISOString(),
}));
const bancoComFalha = { ...banco, gravarFicha: async () => { throw new Error('Disco cheio'); } };
const falha = criarRepositorioLocal(armazenamento, async () => bancoComFalha);
const avisoOriginal = console.warn;
try {
    console.warn = () => {}; // A falha é intencional neste teste de recuperação.
    await assert.rejects(falha.migrarAntiga(normalizarFicha), /originais foram preservados/);
} finally {
    console.warn = avisoOriginal;
}
assert.ok(armazenamento.getItem(antigoNaoMigrado), 'não destruiu a única cópia durante falha');
armazenamento.removeItem(antigoNaoMigrado);

for (const local of ['jogador', 'montaria', '']) {
    const ficha = normalizarFicha({ inventario: { itens: [{ local }] } });
    assert.equal(ficha.inventario.itens[0].local, local);
}

const origem = await identidadeDaImportacao(dadosAntigos);
assert.equal(origem, await identidadeDaImportacao(structuredClone(dadosAntigos)), 'mesmo JSON, mesmo hash');
assert.notEqual(origem, await identidadeDaImportacao(normalizarFicha({ personagem: { 'nome-personagem': 'Outro' } })));
assert.equal(await identidadeDaImportacao({ ...dadosAntigos, railroadId: 'ficha_12345678' }), 'id:ficha_12345678');

console.log('OK: IndexedDB, migração de fichas/fotos/rascunhos, exclusão e identidade de importações.');
