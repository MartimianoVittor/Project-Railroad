import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { coletarInventario, restaurarInventario, iniciarInventario } from '../js/modules/inventario.js';

const ler = (caminho) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');
const inventarioHtml = ler('html/inventario.html');
const lateral = ler('index.html'); // Barra lateral fixa no documento principal.
const principal = ler('index.html');
const shell = ler('css/shell.css');

assert.doesNotMatch(inventarioHtml, /<h3>Teste de traço<\/h3>/);
assert.doesNotMatch(inventarioHtml, /<span>Nome<\/span>/);
assert.match(inventarioHtml, /id="arma-primaria"/);
assert.match(inventarioHtml, /id="arma-secundaria"/);
assert.match(inventarioHtml, /id="rolagem-traco"/);
assert.equal((inventarioHtml.match(/<th\b/g) || []).length, 6, 'tabela com seis colunas');
assert.match(inventarioHtml, /<th[^>]*>Local<\/th>/);
assert.doesNotMatch(inventarioHtml, />Mon\.<\/th>/);

const rotulos = [...lateral.matchAll(/<button[^>]+class="btn-acao-lateral"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/g)]
    .map((match) => match[1]);
assert.deepEqual(rotulos, ['Conta', 'Ficha', 'Local']);
assert.match(principal, /id="fichas-mobile">Ficha<\/button>/);
for (const [arquivo, id] of [
    ['conta', 'fechar-painel-conta'],
    ['fichas', 'fechar-painel-fichas'],
    ['local', 'fechar-painel-locais'],
]) {
    const html = ler(`html/dialogs/${arquivo}.html`);
    assert.match(html, new RegExp(`<form method="dialog"[^>]*>[\\s\\S]*?id="${id}"`));
    assert.match(html, new RegExp(`<button type="submit" id="${id}"`));
}
assert.match(shell, /#jogador \.label-retrato,[\s\S]*?#personagem \.label-retrato \{\s*width: 100%;\s*max-width: none;/);

// DOM mínimo: verifica estrutura, interação e persistência sem navegador externo.
class Elemento {
    constructor(tag) {
        this.tagName = tag.toUpperCase();
        this.children = [];
        this.parentElement = null;
        this.dataset = {};
        this.attributes = {};
        this.listeners = {};
        this.value = '';
    }
    append(...filhos) {
        for (const filho of filhos) {
            filho.parentElement = this;
            this.children.push(filho);
        }
    }
    replaceChildren(...filhos) { this.children = []; this.append(...filhos); }
    setAttribute(chave, valor) { this.attributes[chave] = valor; }
    getAttribute(chave) { return this.attributes[chave]; }
    addEventListener(nome, fn) { (this.listeners[nome] ??= []).push(fn); }
    click() { for (const fn of this.listeners.click || []) fn({ target: this }); }
    closest(seletor) {
        let atual = this;
        while (atual) {
            if (seletor === '.local-item-controles' && atual.className === 'local-item-controles') return atual;
            atual = atual.parentElement;
        }
        return null;
    }
    querySelectorAll(seletor) {
        const resultado = [];
        const visitar = (no) => {
            if (seletor === '.botao-local-item' && no.className?.includes('botao-local-item')) resultado.push(no);
            for (const filho of no.children) visitar(filho);
        };
        visitar(this);
        return resultado;
    }
}
const ids = new Map([
    ['inventario', new Elemento('section')],
    ['lista-itens', new Elemento('tbody')],
    ['espaco-ocupado-jogador', new Elemento('input')],
    ['espaco-ocupado-montaria', new Elemento('input')],
]);
globalThis.document = {
    createElement: (tag) => new Elemento(tag),
    getElementById: (id) => ids.get(id) ?? null,
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
};
let salvamentos = 0;
iniciarInventario(() => { salvamentos++; });
restaurarInventario({ itens: [{ nome: 'Corda', quantidade: 2, tamanho: 3, descricao: 'Teste', local: 'jogador' }] });
const linha = ids.get('lista-itens').children[0];
assert.equal(linha.children.length, 6, 'um TD Local e cinco TDs adicionais');
const local = linha.children[0];
assert.equal(local.className, 'celula-local-item');
const grupo = local.children[0];
assert.equal(grupo.className, 'local-item-controles');
assert.equal(grupo.children.length, 2, 'chapéu e alforge juntos');
const [chapeu, alforge] = grupo.children;
assert.equal(chapeu.getAttribute('aria-pressed'), 'true');
assert.equal(alforge.getAttribute('aria-pressed'), 'false');
assert.equal(ids.get('espaco-ocupado-jogador').value, '6');
alforge.click();
assert.equal(coletarInventario().itens[0].local, 'montaria');
assert.equal(chapeu.getAttribute('aria-pressed'), 'false');
assert.equal(alforge.getAttribute('aria-pressed'), 'true');
assert.equal(ids.get('espaco-ocupado-jogador').value, '0');
assert.equal(ids.get('espaco-ocupado-montaria').value, '6');
alforge.click();
assert.equal(coletarInventario().itens[0].local, '');
assert.equal(alforge.getAttribute('aria-pressed'), 'false');
chapeu.click();
assert.equal(coletarInventario().itens[0].local, 'jogador');
assert.equal(salvamentos, 3, 'uma gravação agendada por clique');
console.log('OK: botões, fechamento nativo, retratos e local único com dois ícones.');
