import assert from 'node:assert/strict';
import { criarGerenciadorFichas } from '../js/modules/fichas.js';
import { normalizarFicha } from '../js/core/validacao.js';
import { criarRepositorioLocal } from '../js/services/fichasLocais.js';
import { criarBancoEmMemoria } from './apoioBanco.mjs';

class Elemento {
    constructor() {
        this.children = [];
        this.listeners = {};
        this.dataset = {};
        this.hidden = false;
        this.value = '';
        this.open = false;
        this.clicks = 0;
    }
    addEventListener(tipo, fn) { (this.listeners[tipo] ??= []).push(fn); }
    disparar(tipo, evento = {}) { for (const fn of this.listeners[tipo] ?? []) fn(evento); }
    click() { this.clicks++; this.disparar('click'); }
    setAttribute(nome, valor) { this[nome] = valor; }
    removeAttribute(nome) { delete this[nome]; }
    replaceChildren(...filhos) { this.children = filhos; }
    append(...filhos) { this.children.push(...filhos); }
    showModal() { this.open = true; }
    close() { this.open = false; }
}

const elementos = new Map();
const porId = (id) => {
    if (!elementos.has(id)) elementos.set(id, new Elemento());
    return elementos.get(id);
};
globalThis.document = {
    getElementById: porId,
    querySelectorAll: () => [new Elemento(), new Elemento()],
    createElement: () => new Elemento(),
    addEventListener: () => {},
};
globalThis.window = { addEventListener: () => {} };
const memoria = new Map();
globalThis.localStorage = {
    getItem: (chave) => memoria.get(chave) ?? null,
    setItem: (chave, valor) => memoria.set(chave, String(valor)),
    removeItem: (chave) => memoria.delete(chave),
    key: (indice) => [...memoria.keys()][indice] ?? null,
    get length() { return memoria.size; },
};
globalThis.confirm = () => true;
globalThis.prompt = () => 'Título renomeado';
globalThis.location = { origin: 'https://railroad.example', pathname: '/Railroad/' };

const linhas = [];
let sequencia = 0;
class Consulta {
    constructor() { this.op = 'list'; this.filtros = []; }
    select() { return this; }
    order() { return this; }
    eq(campo, valor) { this.filtros.push([campo, valor]); return this; }
    single() { this.unico = true; return this; }
    maybeSingle() { this.unico = true; return this; }
    insert(dados) { this.op = 'insert'; this.dados = dados; return this; }
    update(dados) { this.op = 'update'; this.dados = dados; return this; }
    delete() { this.op = 'delete'; return this; }
    then(resolver) {
        const registros = linhas.filter((linha) => this.filtros.every(([campo, valor]) => linha[campo] === valor));
        let data = registros[0] || null;
        let error = null;
        if (this.op === 'insert') {
            const duplicada = this.dados.origem_importacao && linhas.some((linha) =>
                linha.usuario_id === this.dados.usuario_id && linha.origem_importacao === this.dados.origem_importacao);
            if (duplicada) {
                error = { code: '23505', message: 'origem duplicada' };
            } else {
                data = { ...this.dados, id: String(++sequencia), updated_at: new Date().toISOString() };
                linhas.push(data);
            }
        } else if (this.op === 'update') {
            if (data) Object.assign(data, this.dados);
        } else if (this.op === 'delete') {
            if (data) linhas.splice(linhas.indexOf(data), 1);
        } else if (!this.unico) {
            data = [...registros];
        }
        return Promise.resolve(resolver({ data, error }));
    }
}

const usuario = { id: 'usuario-1', email: 'teste@railroad.example' };
let oauthChamadas = 0;
const cliente = {
    from: (tabela) => { assert.equal(tabela, 'fichas'); return new Consulta(); },
    rpc: async (funcao) => {
        assert.equal(funcao, 'listar_convites_jogador');
        return { data: [], error: null };
    },
    auth: {
        onAuthStateChange: () => {},
        getSession: async () => ({ data: { session: { user: usuario } }, error: null }),
        getUser: async () => ({ data: { user: usuario }, error: null }),
        signInWithOAuth: async () => { oauthChamadas++; return { error: null }; },
        signOut: async () => ({ error: null }),
    },
};

// O Railroad antigo salvava apenas uma ficha neste slot.
localStorage.setItem('railroad_rpg_ficha', JSON.stringify(normalizarFicha({
    personagem: { 'nome-personagem': 'Antigo local' },
})));
let formulario = normalizarFicha({});
const gestao = criarGerenciadorFichas({
    coletarFicha: () => structuredClone(formulario),
    carregarFicha: (ficha) => { formulario = structuredClone(ficha); },
    normalizarFicha,
    baixarFicha: () => {},
    interpretarArquivo: (texto) => normalizarFicha(JSON.parse(texto)),
    conectar: async () => cliente,
    configurado: () => true,
    repositorioLocal: criarRepositorioLocal(localStorage, async () => criarBancoEmMemoria()),
});
const aguardar = () => new Promise((resolver) => setTimeout(resolver, 35));

const inicializacao = gestao.iniciar();
porId('entrar-google').click(); // Ação antes da migração e conexão terminarem.
await inicializacao;
await aguardar();
assert.equal(oauthChamadas, 1, 'login espera a inicialização sem alegar configuração ausente');
assert.equal(porId('painel-fichas').open, true, 'login abre gerenciamento online');
assert.equal(porId('conta-autenticada').hidden, false);
assert.equal(formulario.personagem['nome-personagem'], 'Antigo local', 'migra ficha local existente');

porId('btn-conta').click();
await aguardar();
assert.equal(porId('painel-conta').open, true, 'Conta abre painel independente para mesas e convites');
assert.equal(porId('painel-fichas').open, false, 'Conta fecha painel Fichas');
porId('btn-fichas-locais').click();
assert.equal(porId('painel-locais').open, true, 'há painel local independente');
assert.equal(porId('painel-conta').open, false, 'Local fecha painel Conta');
assert.equal(porId('painel-fichas').open, false);
assert.equal(porId('lista-fichas-locais').children.length, 1);

porId('nome-nova-local').value = 'Outro no navegador';
porId('form-criar-local').disparar('submit', { preventDefault() {} });
await aguardar();
assert.equal(porId('lista-fichas-locais').children.length > 0, true);
assert.equal(formulario.personagem['nome-personagem'], 'Outro no navegador');
formulario.personagem['nome-personagem'] = 'Editado sem enviar';
await gestao.salvarAgora();
assert.equal(linhas.length, 0, 'edições locais não são enviadas para o Supabase');

porId('btn-minhas-fichas').click();
await aguardar();
porId('nome-nova-ficha').value = 'Pistoleiro online';
porId('form-criar-ficha').disparar('submit', { preventDefault() {} });
await aguardar();
assert.equal(linhas.length, 1, 'criação de ficha online');
assert.equal(formulario.personagem['nome-personagem'], 'Pistoleiro online');

const arquivo = { text: async () => JSON.stringify(normalizarFicha({
    personagem: { 'nome-personagem': 'Importado do JSON' },
    inventario: { itens: [{ nome: 'Corda', local: 'montaria' }] },
})) };
porId('btn-minhas-fichas').click();
await aguardar();
porId('importar-ficha-local').click();
assert.equal(porId('input-importar-online').clicks, 1, 'botão abre explorador JSON');
porId('input-importar-online').disparar('change', { target: { files: [arquivo], value: 'arquivo.json' } });
await aguardar();
assert.equal(linhas.length, 2, 'importou o JSON como nova ficha online');
assert.equal(formulario.inventario.itens[0].local, 'montaria');

porId('btn-minhas-fichas').click();
await aguardar();
porId('input-importar-online').disparar('change', { target: { files: [arquivo], value: 'arquivo.json' } });
await aguardar();
assert.equal(linhas.length, 2, 'segunda importação idêntica não duplica');
assert.match(porId('mensagem-locais').textContent, /já foi importada/);

const antesDeApagar = structuredClone(linhas);
await gestao.apagarLocalAtual();
assert.deepEqual(linhas, antesDeApagar, 'apagar ficha nunca exclui nem modifica o database');
assert.match(porId('status-salvamento').textContent, /online preservados/);
assert.match(porId('ficha-atual').textContent, /Local:/);

console.log('OK: gerenciadores separados, arquivo JSON, bloqueio de duplicatas e apagar somente no navegador.');
