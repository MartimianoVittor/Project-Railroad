import assert from 'node:assert/strict';
import test from 'node:test';
import { iniciarQuadro } from '../js/modules/quadro/index.js';

function criarQuadro(t) {
    class Alvo {
        style = {};
        dataset = {};
        listeners = {};
        filhos = [];
        classes = new Set();
        classList = {
            add: (nome) => this.classes.add(nome),
            remove: (nome) => this.classes.delete(nome),
            toggle: (nome, ativo) => ativo ? this.classes.add(nome) : this.classes.delete(nome),
        };
        setAttribute(nome, valor) { this[nome] = valor; }
        addEventListener(evento, acao) { this.listeners[evento] = acao; }
        disparar(tipo, evento = {}) { this.listeners[tipo]?.(evento); }
        querySelectorAll() { return this.filhos.filter((filho) => filho.className === 'item-movel'); }
        appendChild(filho) { this.filhos.push(filho); }
        getBoundingClientRect() { return { top: 10, left: 20 }; }
    }
    const campos = Object.fromEntries(['quadro-rpg', 'zona-drop', 'upload-mapa', 'btn-limpar', 'btn-mover',
        'btn-lapis', 'btn-borracha', 'btn-texto', 'seletor-cor'].map((id) => [id, new Alvo()]));
    const canvas = campos['quadro-rpg'];
    const zona = campos['zona-drop'];
    canvas.width = zona.clientWidth = 300;
    canvas.height = zona.clientHeight = 150;
    const operacoes = [];
    canvas.getContext = () => ({
        clearRect() {}, drawImage() { operacoes.push('imagem'); }, beginPath() {}, closePath() {},
        save() {}, restore() {}, lineTo() {}, moveTo() {}, stroke() { operacoes.push(this.globalCompositeOperation); },
    });
    canvas.setPointerCapture = () => {};
    canvas.toDataURL = () => 'data:desenho-atual';
    const leituras = [];
    const imagens = [];
    t.after(() => {
        for (const chave of ['document', 'window', 'FileReader', 'Image', 'confirm']) delete globalThis[chave];
    });
    globalThis.document = { getElementById: (id) => campos[id], createElement: () => new Alvo(), addEventListener() {} };
    globalThis.window = new Alvo();
    globalThis.FileReader = class { readAsDataURL() { leituras.push(this); } };
    globalThis.Image = class { set src(url) { imagens.push(this); } };
    globalThis.confirm = () => true;
    let salvamentos = 0;
    const api = iniciarQuadro({ agendarSalvamento: () => salvamentos++, salvarDadosFicha: () => salvamentos++ });
    return { api, canvas, campos, zona, leituras, imagens, operacoes, salvamentos: () => salvamentos };
}

test('clicar no fundo em Mover limpa a seleção e alternar para Borracha apaga o traço', (t) => {
    const { campos, canvas, operacoes, salvamentos } = criarQuadro(t);
    const ponteiro = { button: 0, pointerId: 1, clientX: 25, clientY: 30 };
    campos['btn-mover'].disparar('click');
    canvas.disparar('pointerdown', ponteiro);
    assert.equal(campos['btn-mover']['aria-pressed'], 'true');
    assert.equal(salvamentos(), 0);
    campos['btn-borracha'].disparar('click');
    assert.equal(campos['btn-mover']['aria-pressed'], 'false');
    canvas.disparar('pointerdown', ponteiro);
    canvas.disparar('pointermove', ponteiro);
    canvas.disparar('pointerup', ponteiro);
    assert.deepEqual(operacoes, ['destination-out']);
    assert.equal(salvamentos(), 1);
});

test('trocar de ficha cancela uma colagem e limpar o quadro cancela o desenho em carregamento', async (t) => {
    const { api, campos, zona, leituras, imagens, operacoes } = criarQuadro(t);
    window.disparar('paste', {
        clipboardData: { items: [{ type: 'image/png', getAsFile: () => ({ type: 'image/png' }) }] },
    });
    api.restaurarQuadro({ desenhoCanvas: 'data:outra-ficha' });
    leituras[0].result = 'data:colagem-anterior';
    leituras[0].onload();
    await Promise.resolve();
    assert.equal(zona.filhos.length, 0);
    assert.equal(api.coletarQuadro().desenhoCanvas, 'data:outra-ficha');
    campos['btn-limpar'].disparar('click');
    imagens[0].onload();
    assert.deepEqual(operacoes, []);
    assert.equal(api.coletarQuadro().desenhoCanvas, 'data:desenho-atual');
});
