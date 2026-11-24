import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretarArquivo } from '../js/core/importExport.js';

test('aceita fichas antigas e preserva dados adicionais sem perder a quantidade zero', () => {
    const ficha = interpretarArquivo(JSON.stringify({ versao: 1, personagem: { apelido: 'Águia' },
        inventario: [{ nome: 'Cantil', quantidade: '0', tamanho: '1', tag: 'antiga' }] }));
    assert.equal(ficha.versao, 3);
    assert.equal(ficha.inventario.itens[0].quantidade, 0);
    assert.equal(ficha.inventario.itens[0].tag, 'antiga');
});
test('recusa inventário malformado, campos perigosos e arquivo de tamanho excessivo', () => {
    for (const dados of [
        { versao: 3, personagem: [] },
        { inventario: { itens: ['objeto incorreto'] } },
        { inventario: { itens: [{ quantidade: -10 }] } },
        { inventario: { rolagens: [] } },
    ]) assert.throws(() => interpretarArquivo(JSON.stringify(dados)));
    assert.throws(() => interpretarArquivo('{"__proto__": {"perigoso": true}}'), /reservado/);
    assert.throws(() => interpretarArquivo('invalido'), /JSON válido/);
    assert.throws(() => interpretarArquivo('x'.repeat(21 * 1024 * 1024)), /20 MB/);
});
