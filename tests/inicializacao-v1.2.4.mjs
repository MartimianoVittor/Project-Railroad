import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { criarGerenciadorFichas } from '../js/modules/fichas.js';

const ler = (arquivo) => readFileSync(new URL(`../${arquivo}`, import.meta.url), 'utf8');
const arquivos = [
    'index.html', 'html/dialogs/conta.html',
    'html/dialogs/fichas.html', 'html/dialogs/local.html',
    'html/jogador.html', 'html/personagem.html',
    'html/inventario.html', 'html/quadro.html',
];
const ids = new Set(arquivos.flatMap((arquivo) =>
    [...ler(arquivo).matchAll(/\bid="([^"]+)"/g)].map((resultado) => resultado[1])
));

const elementos = new Map([...ids].map((id) => [id, {
    id, disabled: false, dataset: {}, textContent: '', listeners: {},
    addEventListener(evento, acao) { this.listeners[evento] = acao; },
    setAttribute() {}, removeAttribute() {},
}]));

// O botão antigo foi removido da interface. O login não pode depender dele.
elementos.delete('btn-apagar-ficha');
globalThis.document = {
    getElementById: (id) => elementos.get(id) || null,
    querySelectorAll: () => [],
    addEventListener() {},
};
globalThis.window = { addEventListener() {} };
globalThis.location = { origin: 'http://127.0.0.1:5500', pathname: '/index.html' };

let chamadasOAuth = 0;
const cliente = {
    auth: {
        signInWithOAuth: async () => {
            chamadasOAuth++;
            return { error: null };
        },
    },
};
const avisos = [];
const avisoOriginal = console.warn;
console.warn = (...args) => avisos.push(args.map(String).join(' '));
try {
    const gerenciador = criarGerenciadorFichas({
        coletarFicha: () => ({}), carregarFicha: () => {},
        normalizarFicha: (dados) => dados,
        baixarFicha: () => {}, interpretarArquivo: JSON.parse,
        configurado: () => true,
        conectar: async () => cliente,
        repositorioLocal: { migrarAntiga: async () => {} },
    });
    assert.doesNotThrow(() => gerenciador.registrarEventos());
    assert.ok(!avisos.some((texto) => texto.includes('btn-apagar-ficha')));
    assert.equal(typeof elementos.get('entrar-google').listeners.click, 'function');
    elementos.get('entrar-google').listeners.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(chamadasOAuth, 1);
} finally {
    console.warn = avisoOriginal;
}

// Verifica que o shell possui os três botões e que o carregador os valida.
const includes = ler('js/includes.js');
for (const id of ['btn-conta', 'btn-minhas-fichas', 'btn-fichas-locais']) {
    assert.match(ler('index.html'), new RegExp(`id="${id}"`));
    assert.match(includes, new RegExp(`'${id}'`));
}
assert.doesNotMatch(ler('index.html'), /data-include="html\/sidebar\.html"/);
assert.match(includes, /Promise\.allSettled/);
assert.match(includes, /cache: 'no-store'/);
assert.match(ler('js/main.js'), /fichas\.registrarEventos\(\)/);
assert.doesNotMatch(ler('js/modules/fichas/eventos.js'), /escutar\('btn-apagar-ficha'/);

console.log('OK: shell completo, login independente de botões removidos e fragmentos isolados.');
