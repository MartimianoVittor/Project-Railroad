import assert from 'node:assert/strict';
import { criarCanvas } from '../js/modules/quadro/canvas.js';

const chamadas = [];
const ctx = {
    drawImage: (...args) => chamadas.push(['desenhar', args.length]),
    clearRect: () => chamadas.push(['limpar']),
};
const canvas = { width: 300, height: 150, toDataURL: () => 'data:image/png;base64,ORIGINAL' };
const zonaDrop = { clientWidth: 0, clientHeight: 0 };
const documentAnterior = globalThis.document;
const imageAnterior = globalThis.Image;

globalThis.document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage: () => {} }) }),
};
let imagemCarregando = null;
globalThis.Image = class {
    set src(valor) { imagemCarregando = this; this.url = valor; }
};

try {
    let salvamentos = 0;
    const api = criarCanvas({ canvas, ctx, zonaDrop, agendarSalvamento: () => salvamentos++ });
    api.ajustarTamanhoCanvas();
    assert.equal(canvas.width, 300, 'aba oculta não reduz canvas a 1px');
    assert.equal(salvamentos, 0, 'aba oculta não salva um quadro vazio');

    api.carregarImagemNoCanvas('data:image/png;base64,DESENHO');
    imagemCarregando.naturalWidth = 600;
    imagemCarregando.naturalHeight = 400;
    imagemCarregando.onload();
    assert.equal(api.obterImagem(), 'data:image/png;base64,DESENHO', 'imagem pendente não é perdida');
    zonaDrop.clientWidth = 720;
    zonaDrop.clientHeight = 480;
    api.ajustarTamanhoCanvas();
    assert.equal(canvas.width, 600, 'redimensionamento não altera a resolução do desenho');
    assert.equal(canvas.height, 400, 'redimensionamento não deforma a proporção');
    assert.equal(salvamentos, 0, 'primeira medição visível não grava alterações artificiais');
    assert.equal(api.obterImagem(), 'data:image/png;base64,DESENHO', 'redimensionar não deve reexportar o desenho');
    assert.ok(chamadas.some(([nome]) => nome === 'desenhar'));
} finally {
    globalThis.document = documentAnterior;
    globalThis.Image = imageAnterior;
}
console.log('OK: quadro preservado ao abrir uma página antes oculta.');
