import assert from 'node:assert/strict';
import { criarGerenciadorFichas } from '../js/modules/fichas.js';
import { criarRepositorioLocal } from '../js/services/fichasLocais.js';
import { normalizarFicha } from '../js/core/validacao.js';
import { criarBancoEmMemoria } from './apoioBanco.mjs';

const elementos = new Map();
const elemento = (id) => {
    if (!elementos.has(id)) elementos.set(id, {
        dataset: {}, hidden: false, disabled: false,
        addEventListener(tipo, acao) { this[`evento_${tipo}`] = acao; },
        setAttribute() {}, removeAttribute() {},
    });
    return elementos.get(id);
};

globalThis.document = {
    getElementById: elemento,
    querySelectorAll: () => [],
    addEventListener: () => {},
};
globalThis.window = { addEventListener: () => {} };
globalThis.location = { origin: 'https://railroad.example', pathname: '/Railroad/' };

const memoria = new Map();
const armazenamento = {
    getItem: (chave) => memoria.get(chave) ?? null,
    setItem: (chave, valor) => memoria.set(chave, String(valor)),
    removeItem: (chave) => memoria.delete(chave),
    key: (indice) => [...memoria.keys()][indice] ?? null,
    get length() { return memoria.size; },
};

let tentativas = 0;
let logins = 0;
const cliente = {
    auth: {
        onAuthStateChange: () => {},
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithOAuth: async () => { logins++; return { error: null }; },
    },
};

const gestor = criarGerenciadorFichas({
    coletarFicha: () => normalizarFicha({}),
    carregarFicha: () => {},
    normalizarFicha,
    baixarFicha: () => {},
    interpretarArquivo: JSON.parse,
    configurado: () => true,
    conectar: async () => {
        tentativas++;
        if (tentativas === 1) throw new Error('Biblioteca CDN indisponível');
        return cliente;
    },
    repositorioLocal: criarRepositorioLocal(armazenamento, async () => criarBancoEmMemoria()),
});

const avisoOriginal = console.warn;
try {
    console.warn = () => {}; // Simula uma falha esperada de rede.
    await gestor.iniciar();
} finally {
    console.warn = avisoOriginal;
}
assert.match(elemento('mensagem-conta').textContent, /Biblioteca CDN indisponível/);
elemento('entrar-google').evento_click();
await new Promise((resolver) => setTimeout(resolver, 30));
assert.equal(tentativas, 2, 'uma falha inicial não bloqueia nova tentativa');
assert.equal(logins, 1, 'login Google é oferecido após a conexão voltar');
console.log('OK: indisponibilidade temporária do Supabase e nova tentativa de login.');
