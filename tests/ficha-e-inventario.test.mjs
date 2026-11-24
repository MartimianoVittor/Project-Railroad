import assert from 'node:assert/strict';
import test from 'node:test';
import { criarEditorFicha } from '../js/core/editorFicha.js';
import { interpretarArquivo } from '../js/core/importExport.js';
import { normalizarFicha } from '../js/core/validacao.js';
import { espacoOcupado } from '../js/dominio/inventario.js';
import { identidadeDaImportacao, identificarArquivo } from '../js/services/identidadeImportacao.js';

const legado = {
    versao: 1, personagem: { 'nome-personagem': 'Rosa' },
    inventario: [{ nome: 'Cantil', quantidade: 0, tamanho: '2', cor: 'preto' }],
};

test('quantidade zero atravessa abertura, cálculo de carga e nova importação', () => {
    const ficha = interpretarArquivo(JSON.stringify(legado));
    assert.equal(ficha.versao, 3);
    assert.deepEqual(interpretarArquivo(JSON.stringify(ficha)), ficha);
    const [cantil] = ficha.inventario.itens;
    assert.equal(cantil.quantidade, 0);
    assert.equal(cantil.cor, 'preto');
    const itens = normalizarFicha({
        versao: 2, inventario: { itens: [cantil, { tamanho: 3 }, { quantidade: 2, tamanho: 4, local: 'montaria' }] },
    }).inventario.itens;
    assert.equal(itens[1].quantidade, 1);
    assert.deepEqual(espacoOcupado(itens), { jogador: 3, montaria: 8 });
});

test('o editor preserva os dados que nenhum campo da interface edita', () => {
    let itens;
    const editor = criarEditorFicha({
        jogador: { restaurarJogador() {}, coletarJogador: () => ({ nome: 'Vittor' }) },
        personagem: {
            restaurarPersonagem() {},
            coletarPersonagem: () => ({ 'nome-personagem': 'Rosa', marcadores: { 'traco-1': [true] } }),
        },
        inventario: {
            restaurarInventario(dados) { itens = dados.itens; },
            coletarInventario: () => ({ itens, rolagens: { 'rolagem-bonus': '1' } }),
        },
        quadro: null,
    });
    editor.carregarFicha({
        railroadId: 'original-01', mesa: 'Ferrovia', desenhoCanvas: 'data:image/png;base64,QQ==',
        itensQuadro: [{ tipo: 'texto', texto: 'Diário' }],
        personagem: { origem: 'Oeste', marcadores: { costume: [false, true] } },
        inventario: { bolso: 2, rolagens: { dadoEspecial: 12 }, itens: legado.inventario },
    });
    const ficha = interpretarArquivo(JSON.stringify(editor.coletarFicha()));
    assert.equal(ficha.railroadId, 'original-01');
    assert.equal(ficha.mesa, 'Ferrovia');
    assert.equal(ficha.personagem.origem, 'Oeste');
    assert.deepEqual(ficha.personagem.marcadores, { costume: [false, true], 'traco-1': [true] });
    assert.equal(ficha.inventario.bolso, 2);
    assert.equal(ficha.inventario.itens[0].quantidade, 0);
    assert.equal(ficha.inventario.itens[0].cor, 'preto');
    assert.deepEqual(ficha.inventario.rolagens, { dadoEspecial: 12, 'rolagem-bonus': '1' });
    assert.equal(ficha.desenhoCanvas, 'data:image/png;base64,QQ==');
    assert.equal(ficha.itensQuadro[0].texto, 'Diário');

    editor.carregarFicha({});
    assert.equal(editor.coletarFicha().mesa, undefined);
});

test('importação reconhece a assinatura antiga após a correção da quantidade zero', async () => {
    const { principal, anterior } = await identificarArquivo(normalizarFicha(legado), JSON.stringify(legado));
    // Assinatura efetivamente produzida pelo aplicativo anterior para este arquivo.
    assert.equal(anterior, 'sha256:cbffc6a8ea172040d083fca5b7d3c8d61fa79acf7e272c1128b397587250bfe1');
    assert.equal(principal, await identidadeDaImportacao(legado));
    assert.notEqual(principal, anterior);
    const reorganizada = { inventario: legado.inventario, personagem: legado.personagem, versao: 1 };
    assert.equal(await identidadeDaImportacao(reorganizada), principal);
    const consumido = structuredClone(legado);
    consumido.inventario[0].quantidade = 1;
    assert.notEqual(await identidadeDaImportacao(consumido), principal);
    assert.deepEqual(await identificarArquivo({ railroadId: 'original-01' }, ''), { principal: 'id:original-01' });
});
