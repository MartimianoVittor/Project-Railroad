import assert from 'node:assert/strict';
import { criarGerenciadorFichas } from '../js/modules/fichas.js';

function prepararDOM() {
    const elementos = new Map();
    const obter = (id) => {
        if (!elementos.has(id)) elementos.set(id, {
            id, textContent: '', dataset: {}, disabled: false,
            listeners: {},
            addEventListener(evento, callback) { this.listeners[evento] = callback; },
            setAttribute() {}, removeAttribute() {},
        });
        return elementos.get(id);
    };
    globalThis.document = {
        getElementById: obter,
        querySelectorAll: () => [],
        addEventListener: () => {},
    };
    globalThis.window = { addEventListener: () => {} };
    globalThis.location = { origin: 'http://127.0.0.1:5500', pathname: '/index.html' };
    return obter;
}

const base = {
    coletarFicha: () => ({}), carregarFicha: () => {},
    normalizarFicha: (dados) => dados,
    baixarFicha: () => {}, interpretarArquivo: JSON.parse,
};

// Uma migração do IndexedDB que não termina não pode bloquear o login.
const porId = prepararDOM();
let logins = 0;
const cliente = {
    auth: {
        signInWithOAuth: async ({ provider, options }) => {
            assert.equal(provider, 'google');
            assert.equal(options.redirectTo, 'http://127.0.0.1:5500/index.html');
            logins++;
            return { error: null };
        },
    },
};
const gestor = criarGerenciadorFichas({
    ...base,
    configurado: () => true,
    conectar: async () => cliente,
    repositorioLocal: { migrarAntiga: () => new Promise(() => {}) },
});
gestor.registrarEventos();
assert.equal(porId('entrar-google').disabled, false);
porId('entrar-google').listeners.click();
await new Promise((resolver) => setTimeout(resolver, 25));
assert.equal(logins, 1, 'OAuth deve começar mesmo com IndexedDB bloqueado');
assert.match(porId('mensagem-conta').textContent, /Autenticação iniciada/);

// Configuração ausente deve produzir um aviso em vez de um botão inativo.
const porId2 = prepararDOM();
const semConfiguracao = criarGerenciadorFichas({
    ...base,
    configurado: () => false,
    conectar: async () => { throw new Error('Não deveria conectar'); },
    repositorioLocal: { migrarAntiga: () => new Promise(() => {}) },
});
semConfiguracao.registrarEventos();
const erroOriginal = console.error;
console.error = () => {}; // Falha de configuração simulada intencionalmente.
porId2('entrar-google').listeners.click();
await new Promise((resolver) => setTimeout(resolver, 25));
console.error = erroOriginal;
assert.match(porId2('mensagem-conta').textContent, /Preencha a URL e a chave pública/);
assert.equal(porId2('entrar-google').disabled, false);
console.log('OK: login independente do IndexedDB e erros de configuração visíveis.');
