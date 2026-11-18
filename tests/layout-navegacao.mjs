import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const ler = (arquivo) => readFileSync(new URL(arquivo, root), 'utf8');
const principal = ler('index.html');
const lateral = principal; // A barra lateral fixa integra o shell do index.html.
const navegacao = ler('js/navegacao.js');
const estilos = ler('css/shell.css');
const gestor = ler('js/modules/fichas.js');

const paginas = ['jogador', 'personagem', 'inventario', 'quadro-mobile'];
for (const pagina of paginas) {
    assert.match(principal, new RegExp(`id="${pagina}"|data-include="html/${pagina}\\.html"`));
    const menu = principal;
    assert.match(menu, new RegExp(`data-aba="${pagina}"`));
    assert.match(navegacao, new RegExp(`'${pagina}'`));
}

for (const acao of ['Conta', 'Ficha', 'Local'])
    assert.match(lateral, new RegExp(`<span>${acao}</span>`));

assert.ok(lateral.indexOf('id="btn-conta"') < lateral.indexOf('id="btn-minhas-fichas"'));
assert.ok(lateral.indexOf('id="btn-minhas-fichas"') < lateral.indexOf('id="btn-fichas-locais"'));
assert.match(lateral, /class="subtitulo-marca">Jogador<\/span>/);
assert.doesNotMatch(lateral.match(/<nav class="menu-navegacao"[\s\S]*?<\/nav>/)?.[0] || '', /data-aba="quadro-mobile"/);
assert.match(principal, /id="alvo-quadro-desktop"/);
assert.doesNotMatch(principal, /data-include="html\/sidebar\.html"/);
assert.match(principal, /id="quadro-mobile" class="pagina-ficha"[^>]*><\/section>/);
assert.match(navegacao, /function posicionarQuadro\(/);
assert.match(navegacao, /destino\.append\(conteudo\)/);
assert.match(estilos, /--largura-sidebar: 160px/);
assert.match(estilos, /scrollbar-gutter: auto/);

for (const arquivo of ['html/dialogs/fichas.html', 'html/dialogs/conta.html', 'html/dialogs/local.html'])
    assert.ok(principal.includes(`data-include="${arquivo}"`), `${arquivo} é carregado no HTML`);

assert.match(ler('html/dialogs/fichas.html'), /id="form-criar-ficha"/);
assert.match(ler('html/dialogs/conta.html'), /id="lista-convites-mesas"/);
assert.match(ler('html/dialogs/local.html'), /id="exportar-json"/);
assert.match(ler('html/dialogs/local.html'), /id="input-importar-online"/);
assert.match(gestor, /painelConta/);
assert.match(estilos, /overflow-y: auto/);
assert.match(estilos, /#quadro-mobile\.ativa/);

// Os formulários e IDs das fichas originais continuam no projeto.
for (const id of ['nome-jogador', 'nome-personagem', 'rolagem-traco', 'quadro-rpg']) {
    const origem = id === 'nome-jogador' ? 'html/jogador.html'
        : id === 'nome-personagem' ? 'html/personagem.html'
        : id === 'rolagem-traco' ? 'html/inventario.html' : 'html/quadro.html';
    assert.ok(ler(origem).includes(`id="${id}"`), `${id} preservado`);
}
console.log('OK: Jogador + Quadro no desktop, Quadro independente no mobile e fichas preservadas.');
