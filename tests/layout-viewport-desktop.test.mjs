import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (arquivo) => readFileSync(new URL(`../${arquivo}`, import.meta.url), 'utf8');

// Os includes removem data-include quando carregados. A classe permanece;
// assim, os elementos internos continuam participando da grade principal.
test('Personagem e Inventário preservam o contêiner transparente após carregar HTML', () => {
    const index = ler('index.html');
    const css = ler('css/viewport-desktop.css');
    for (const nome of ['personagem', 'inventario'])
        assert.match(index, new RegExp(`data-include="html/${nome}\\.html" class="fragmento-pagina"`));
    assert.match(css, /#area-fichas\s*>\s*\.fragmento-pagina\s*\{\s*display:\s*contents/);
});

test('desktop restringe a altura do documento sem bloquear conteúdo longo dos cartões', () => {
    const principal = ler('css/main.css');
    const css = ler('css/viewport-desktop.css');
    assert.match(principal, /@import url\("\.\/viewport-desktop\.css\?v=1\.4\.26"\)/);
    assert.ok(principal.lastIndexOf('viewport-desktop.css') > principal.lastIndexOf('dialogos-railroad.css'),
        'a folha de viewport deve prevalecer sobre as regras legadas');
    assert.match(css, /@media\s*\(min-width:\s*769px\)/);
    assert.match(css, /#area-fichas\s*\{[^}]*height:\s*100dvh[^}]*overflow:\s*hidden/s);
    assert.match(css, /#personagem\s*>\s*\.col\.double\s*\{[^}]*overflow-y:\s*auto/s);
    assert.match(css, /#inventario\.ativa\s*>\s*\.col\s*\{[^}]*overflow-y:\s*auto/s);
    assert.doesNotMatch(css, /@media\s*\(max-width:\s*768px\)/,
        'regras de confinamento não devem alterar a rolagem natural do mobile');
});

test('o quadro mantém bitmap preservado sem exigir altura além do cartão no desktop', () => {
    const css = ler('css/viewport-desktop.css');
    const quadro = ler('js/modules/quadro/canvas.js');
    const navegacao = ler('js/navegacao.js');
    assert.match(css, /\.painel-quadro-jogador\s*\.area-canvas\s*\{[^}]*flex:\s*1 1 0%[^}]*min-height:\s*0[^}]*overflow:\s*hidden/s);
    assert.match(css, /#quadro-rpg\s*\{[^}]*max-height:\s*100%[^}]*object-fit:\s*contain/s);
    assert.match(quadro, /canvas\.width\s*=\s*imagem\.naturalWidth/);
    assert.match(quadro, /canvas\.height\s*=\s*imagem\.naturalHeight/);
    assert.match(navegacao, /function posicionarQuadro\(/);
});
