import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (arquivo) => readFileSync(new URL(`../${arquivo}`, import.meta.url), 'utf8');
const index = ler('index.html');
const html = [
    index,
    ...[
        'html/jogador.html', 'html/personagem.html', 'html/inventario.html',
        'html/quadro.html', 'html/dialogs/conta.html',
        'html/dialogs/fichas.html', 'html/dialogs/local.html',
    ].map(ler),
].join('\n');

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((resultado) => resultado[1]);
const idsUnicos = new Set(ids);
assert.equal(idsUnicos.size, ids.length, 'Nenhum ID HTML pode ser duplicado.');

// A barra lateral deve existir antes de qualquer fetch ou import dinâmico.
for (const id of ['btn-conta', 'btn-minhas-fichas', 'btn-fichas-locais']) {
    assert.ok(index.includes(`id="${id}"`), `Controle ${id} deve estar no index.html.`);
}
assert.doesNotMatch(index, /data-include="html\/sidebar\.html"/);

const gestor = ler('js/modules/fichas.js');
const escutados = [...gestor.matchAll(/escutar\('([^']+)'/g)].map((resultado) => resultado[1]);
for (const id of escutados)
    assert.ok(idsUnicos.has(id), `O JavaScript utiliza #${id}, ausente no HTML.`);

// O X dos três diálogos precisa ser um submit de um form method=dialog.
for (const painel of ['conta', 'fichas', 'locais']) {
    const id = painel === 'locais' ? 'painel-locais' : `painel-${painel}`;
    assert.ok(idsUnicos.has(id), `Painel ${id} não encontrado.`);
    assert.ok(idsUnicos.has(`fechar-painel-${painel}`), `Botão X de ${id} não encontrado.`);
}

const carregador = ler('js/includes.js');
assert.match(carregador, /Promise\.allSettled/);
assert.match(carregador, /cache: 'no-store'/);
assert.match(carregador, /v=1\.2\.5/);
assert.match(ler('js/main.js'), /fichas\.registrarEventos\(\)/);
assert.match(ler('js/main.js'), /await Promise\.all/);
assert.match(index, /js\/navegacao\.js\?v=1\.2\.5/);

console.log('OK: IDs únicos, botões presentes e painéis conectados ao JavaScript.');
