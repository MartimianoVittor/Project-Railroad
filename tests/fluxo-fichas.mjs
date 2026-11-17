import assert from 'node:assert/strict';
import { criarGerenciadorFichas } from '../js/modules/fichas.js';
import { normalizarFicha } from '../js/core/validacao.js';

class Elemento {
    constructor() { this.children = []; this.listeners = {}; this.dataset = {}; this.hidden = false; this.value = ''; this.open = false; }
    addEventListener(tipo, fn) { (this.listeners[tipo] ??= []).push(fn); }
    async disparar(tipo, evento = {}) { for (const fn of this.listeners[tipo] ?? []) await fn(evento); }
    setAttribute(nome, valor) { this[nome] = valor; }
    removeAttribute(nome) { delete this[nome]; }
    replaceChildren(...filhos) { this.children = filhos; }
    append(...filhos) { this.children.push(...filhos); }
    showModal() { this.open = true; }
    close() { this.open = false; }
}
const elementos = new Map();
const obter = (id) => { if (!elementos.has(id)) elementos.set(id, new Elemento()); return elementos.get(id); };
globalThis.document = {
    getElementById: obter,
    querySelectorAll: () => [new Elemento(), new Elemento()],
    createElement: () => new Elemento(),
    addEventListener: () => {},
};
globalThis.window = { addEventListener: () => {} };
const memoria = new Map();
globalThis.localStorage = {
    getItem: (k) => memoria.get(k) ?? null,
    setItem: (k, v) => memoria.set(k, v),
    removeItem: (k) => memoria.delete(k),
};
globalThis.confirm = () => true;
globalThis.prompt = () => 'Ficha renomeada';
globalThis.location = { origin: 'https://railroad.example', pathname: '/Railroad/' };

const linhas = [];
let contador = 0;
class Consulta {
    constructor() { this.op = 'list'; this.filtro = null; }
    select() { return this; }
    order() { return this; }
    eq(_, valor) { this.filtro = valor; return this; }
    single() { return this; }
    insert(dados) { this.op = 'insert'; this.dados = dados; return this; }
    update(dados) { this.op = 'update'; this.dados = dados; return this; }
    delete() { this.op = 'delete'; return this; }
    then(resolver) {
        let data;
        if (this.op === 'insert') {
            data = { ...this.dados, id: String(++contador), updated_at: new Date().toISOString() };
            linhas.push(data);
        } else if (this.op === 'update') {
            data = linhas.find((l) => l.id === this.filtro);
            if (data) Object.assign(data, this.dados);
        } else if (this.op === 'delete') {
            const indice = linhas.findIndex((l) => l.id === this.filtro);
            data = indice < 0 ? null : linhas.splice(indice, 1)[0];
        } else {
            data = this.filtro ? linhas.find((l) => l.id === this.filtro) : [...linhas];
        }
        return Promise.resolve(resolver({ data, error: null }));
    }
}
const usuario = { id: 'usuario-1', email: 'teste@example.org' };
const cliente = {
    from: () => new Consulta(),
    auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        getSession: async () => ({ data: { session: { user: usuario } }, error: null }),
        getUser: async () => ({ data: { user: usuario }, error: null }),
        signOut: async () => ({ error: null }),
    },
};
let edicao = normalizarFicha({});
const gestor = criarGerenciadorFichas({
    coletarFicha: () => structuredClone(edicao),
    carregarFicha: (f) => { edicao = structuredClone(f); },
    normalizarFicha,
    lerLocal: () => null,
    gravarLocal: () => {},
    apagarLocal: () => {},
    conectar: async () => cliente,
    configurado: () => true,
});
await gestor.iniciar();
assert.equal(obter('painel-fichas').open, true);
assert.equal(obter('conta-autenticada').hidden, false);
obter('nome-nova-ficha').value = 'Pistoleiro fictício';
await obter('form-criar-ficha').disparar('submit', { preventDefault() {} });
await new Promise((r) => setTimeout(r, 40));
assert.equal(linhas.length, 1, 'criação de ficha');
assert.equal(obter('painel-fichas').open, false, 'seleção da ficha criada');
assert.equal(edicao.personagem['nome-personagem'], 'Pistoleiro fictício');

edicao.inventario.itens.push({ nome: 'Corda', quantidade: 1, tamanho: 1, local: 'montaria' });
assert.equal(gestor.salvarAgora(), true);
await new Promise((r) => setTimeout(r, 1400));
assert.equal(linhas[0].dados.inventario.itens[0].local, 'montaria', 'salvamento na nuvem');
assert.equal([...memoria.keys()].filter((k) => k.startsWith('railroad_rascunho')).length, 0, 'rascunho sincronizado removido');

await gestor.importarFicha(normalizarFicha({ personagem: { 'nome-personagem': 'Outro personagem' } }));
assert.equal(linhas.length, 2, 'importação cria outra ficha');
assert.equal(edicao.personagem['nome-personagem'], 'Outro personagem');
assert.equal(linhas[0].dados.inventario.itens[0].local, 'montaria', 'a ficha anterior não foi sobrescrita');

// Reabrir a primeira ficha não pode misturar os dados da segunda.
await obter('btn-minhas-fichas').disparar('click');
await new Promise((r) => setTimeout(r, 40));
const lista = obter('lista-fichas');
const linhaPrimeira = lista.children.find((l) => l.children[0].children[0].textContent === 'Pistoleiro fictício');
await linhaPrimeira.children[1].children[0].disparar('click');
await new Promise((r) => setTimeout(r, 40));
assert.equal(edicao.inventario.itens[0].local, 'montaria', 'troca restaura os itens corretos');
assert.equal(edicao.personagem['nome-personagem'], 'Pistoleiro fictício');

await obter('btn-minhas-fichas').disparar('click');
await new Promise((r) => setTimeout(r, 40));
const linhaRenomear = obter('lista-fichas').children.find((l) => l.children[0].children[0].textContent === 'Pistoleiro fictício');
await linhaRenomear.children[1].children[1].disparar('click');
await new Promise((r) => setTimeout(r, 40));
assert.equal(linhas[0].titulo, 'Ficha renomeada');

const linhaDuplicar = obter('lista-fichas').children.find((l) => l.children[0].children[0].textContent === 'Ficha renomeada');
await linhaDuplicar.children[1].children[2].disparar('click');
await new Promise((r) => setTimeout(r, 40));
assert.equal(linhas.length, 3, 'duplicação cria terceiro registro');
assert.equal(linhas[2].dados.inventario.itens[0].local, 'montaria');

await gestor.apagarAtual();
assert.equal(linhas.length, 2, 'exclusão remove apenas a ficha aberta');
assert.equal(obter('conta-autenticada').hidden, false, 'conta permanece conectada');
console.log('OK: sessão simulada, múltiplas fichas, sincronização, troca, renomeação, duplicação e exclusão.');
