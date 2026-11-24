import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

test('Imagem usa botão equivalente às demais ferramentas', () => {
    const html = ler('html/quadro.html');
    assert.match(html, /<button[^>]+id="btn-imagem"[^>]*class="btn-oeste"[^>]*>Imagem<\/button>/);
    assert.match(ler('js/modules/quadro/index.js'), /porId\('btn-imagem'\).*addEventListener\('click'/);
    assert.match(html, /id="upload-mapa"/);
});

test('Personalização não cria quadros brancos ou molduras adicionais', () => {
    const css = ler('css/janelas-jogador.css');
    assert.match(css, /#personalizacao\.rr-leitura-automatica \.rr-grupo-visual legend/);
    assert.match(css, /#personalizacao\.rr-leitura-automatica \.rr-grupo-visual > p/);
    assert.match(css, /color: var\(--rr-leitura-suave\) !important/);
    assert.match(css, /border: 0 !important/);
    assert.match(css, /scroll-padding-top: 18px/);
});
