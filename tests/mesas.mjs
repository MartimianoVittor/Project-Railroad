import assert from 'node:assert/strict';
import { criarRepositorioMesas } from '../js/services/mesasRepository.js';
import { criarPainelConvitesMesa } from '../js/modules/convitesMesa.js';

const chamadas = [];
const cliente = {
    rpc: async (nome, parametros) => {
        chamadas.push([nome, parametros]);
        if (nome === 'listar_convites_jogador') return { data: [], error: null };
        if (nome === 'listar_fichas_enviadas_mesa') return { data: [], error: null };
        return { data: null, error: null };
    },
};
const repo = criarRepositorioMesas(cliente);
await repo.listarConvites();
await repo.responderConvite('convite-1', true);
await repo.enviarFicha('convite-1', 'ficha-1');
await repo.retirarFicha('envio-1');
assert.deepEqual(chamadas, [
    ['listar_convites_jogador', undefined],
    ['responder_convite_mesa', { p_convite_id: 'convite-1', p_aceitar: true }],
    ['enviar_ficha_mesa', { p_convite_id: 'convite-1', p_ficha_id: 'ficha-1' }],
    ['retirar_ficha_mesa', { p_envio_id: 'envio-1' }],
]);

class Elemento {
    constructor(tag = '') {
        this.tag = tag;
        this.children = [];
        this.events = {};
        this.value = '';
    }
    append(...filhos) { this.children.push(...filhos); }
    replaceChildren(...filhos) { this.children = filhos; }
    addEventListener(tipo, callback) { (this.events[tipo] ??= []).push(callback); }
    disparar(tipo, evento = {}) { for (const callback of this.events[tipo] ?? []) callback(evento); }
    setAttribute(nome, valor) { this[nome] = valor; }
}

const elementos = new Map();
globalThis.document = {
    getElementById(id) {
        if (!elementos.has(id)) elementos.set(id, new Elemento());
        return elementos.get(id);
    },
    createElement: (tag) => new Elemento(tag),
};

const convites = [
    { convite_id: 'c-1', campanha_nome: 'Noite Sangrenta', status: 'pendente' },
    { convite_id: 'c-2', campanha_nome: 'Trilhos do Oeste', status: 'aceito' },
];
const envios = [{ envio_id: 'e-1', ficha_id: 'f-1', titulo: 'Pistoleiro', status: 'aprovada' }];
const operacoes = [];
const painel = criarPainelConvitesMesa({
    repositorio: {
        listarConvites: async () => structuredClone(convites),
        listarFichasEnviadas: async () => structuredClone(envios),
        responderConvite: async (id, aceita) => {
            operacoes.push(['resposta', id, aceita]);
            convites[0].status = aceita ? 'aceito' : 'recusado';
        },
        enviarFicha: async (convite, ficha) => {
            operacoes.push(['envio', convite, ficha]);
            envios.push({ envio_id: 'e-2', ficha_id: ficha, titulo: 'Guerreiro', status: 'pendente' });
        },
        retirarFicha: async (id) => { operacoes.push(['retirada', id]); },
    },
    executarAcao: (acao) => acao(),
});

const encontrar = (no, predicado) => {
    if (predicado(no)) return no;
    for (const filho of no.children ?? []) {
        const encontrado = encontrar(filho, predicado);
        if (encontrado) return encontrado;
    }
    return null;
};
const aguardar = () => new Promise((resolver) => setTimeout(resolver, 15));

await painel.atualizar('jogador-1', [
    { id: 'f-1', titulo: 'Pistoleiro' },
    { id: 'f-2', titulo: 'Guerreiro' },
]);
assert.equal(document.getElementById('lista-convites-mesas').children.length, 2);
assert.equal(document.getElementById('codigo-jogador-mesas').textContent, 'jogador-1');

const lista = document.getElementById('lista-convites-mesas');
const aceitar = encontrar(lista.children[0], (el) => el.textContent === 'Aceitar ingresso');
aceitar.disparar('click');
await aguardar();
assert.deepEqual(operacoes, [['resposta', 'c-1', true]], 'aceitar a mesa NÃO envia fichas automaticamente');

const formulario = encontrar(lista.children[1], (el) => el.tag === 'form');
const seletor = encontrar(formulario, (el) => el.tag === 'select');
seletor.value = 'f-2';
formulario.disparar('submit', { preventDefault() {} });
await aguardar();
assert.deepEqual(operacoes[1], ['envio', 'c-2', 'f-2']);
assert.equal(envios.length, 2, 'permite múltiplos personagens na mesma campanha');

painel.limpar();
assert.equal(document.getElementById('lista-convites-mesas').children.length, 0);
console.log('OK: convites, aceite independente, envio múltiplo e limpeza de sessão.');
