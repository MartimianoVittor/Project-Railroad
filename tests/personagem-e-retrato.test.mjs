import assert from 'node:assert/strict';
import test from 'node:test';
import { facesDoTraco, TRACOS } from '../js/dominio/tracos.js';
import { iniciarRolagem } from '../js/modules/inventario/rolagem.js';
import { coletarPersonagem, observarPersonagem, restaurarPersonagem } from '../js/modules/personagem.js';
import { criarRetrato } from '../js/modules/retrato.js';

class Elemento {
    children = [];
    dataset = {};
    eventos = new Map();
    append(...filhos) { this.children.push(...filhos); }
    replaceChildren(...filhos) { this.children = filhos; }
    setAttribute(nome, valor) { this[nome] = valor; }
    getAttribute(nome) { return this[nome]; }
    addEventListener(nome, acao) { this.eventos.set(nome, acao); }
}

test('os 48 marcadores e o seletor de rolagem compartilham os 12 traços da ficha', (t) => {
    const grade = new Elemento();
    const seletor = new Elemento();
    const saida = new Elemento();
    const botao = new Elemento();
    const campos = { 'tracos-personagem': grade, 'rolagem-traco': seletor, 'resultado-traco': saida };
    const marcadores = () => grade.children.slice(1).flatMap((linha) =>
        linha.children[1].children.map((rotulo) => rotulo.children[0]));
    t.after(() => { delete globalThis.document; });
    globalThis.document = {
        createElement: () => new Elemento(),
        getElementById: (id) => campos[id],
        querySelectorAll: marcadores,
        querySelector: () => botao,
    };
    observarPersonagem(() => {});
    iniciarRolagem();
    assert.equal(marcadores().length, 48);
    assert.deepEqual(seletor.children.map((opcao) => [opcao.value, opcao.textContent]), TRACOS);
    for (const [indice, [id, nome]] of TRACOS.entries()) {
        const grupo = marcadores().slice(indice * 4, indice * 4 + 4);
        assert.ok(grupo.every((campo) => campo.dataset.grupo === id));
        assert.deepEqual(grupo.map((campo) => campo['aria-label']), [4, 6, 8, 12].map((dado) => nome + ', d' + dado));
    }
    const marcas = [false, false, true, false];
    restaurarPersonagem({ personagem: { marcadores: { 'traco-2': marcas } } });
    assert.deepEqual(coletarPersonagem().marcadores['traco-2'], marcas);
    assert.equal(facesDoTraco(marcas), 8);
    seletor.value = 'traco-2';
    botao.eventos.get('click')();
    assert.match(saida.textContent, /^d8: [1-8] /);
});

test('uma foto lida com atraso não substitui a foto escolhida depois ou a de outra ficha', async (t) => {
    const foto = new Elemento();
    const campo = new Elemento();
    campo.files = [{ type: 'image/png' }];
    t.after(() => { delete globalThis.document; });
    globalThis.document = { getElementById: (id) => id === 'foto-personagem' ? foto : campo };
    const leituras = [];
    const retrato = criarRetrato('personagem', () => new Promise((resolver) => leituras.push(resolver)));
    let edicoes = 0;
    retrato.observar(() => edicoes++);
    const escolher = campo.eventos.get('change');
    const primeira = escolher();
    const segunda = escolher();
    leituras[1]('data:segunda');
    await segunda;
    leituras[0]('data:primeira');
    await primeira;
    assert.equal(retrato.coletar(), 'data:segunda');
    const terceira = escolher();
    retrato.restaurar('data:outra-ficha');
    leituras[2]('data:terceira');
    await terceira;
    assert.equal(retrato.coletar(), 'data:outra-ficha');
    assert.equal(edicoes, 1);
});
