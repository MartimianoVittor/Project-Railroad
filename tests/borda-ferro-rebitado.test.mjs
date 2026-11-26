import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const ler = (caminho) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

// Esta moldura é aplicada a colunas roláveis e a amostras menores da prévia.
// Uma decoração posicionada fora do contêiner pode fabricar overflow e fazer
// os rebites se moverem junto com o conteúdo.
test('ferro rebitado pinta os rebites na borda sem gerar conteúdo rolável', () => {
    const bordas = ler('css/tema/bordas.css');
    const ajustes = ler('css/ajustes-019.css');
    const caminho = 'assets/western/kit/ferro-rebitado-moldura.svg';
    assert.ok(existsSync(new URL(`../${caminho}`, import.meta.url)));
    assert.match(bordas, /\.rr-borda--ferro-rebitado\s*\{[^}]*border-image-source:\s*url\("\.\.\/\.\.\/assets\/western\/kit\/ferro-rebitado-moldura\.svg"\)/s);
    assert.match(bordas, /\.rr-borda--ferro-rebitado\s*\{[^}]*border-image-outset:\s*0/s);
    assert.match(bordas, /\.rr-borda--ferro-rebitado\s*\{[^}]*border-image-repeat:\s*round/s);
    assert.match(bordas, /\.rr-borda--ferro-rebitado::after\s*\{\s*content:\s*none;/s);
    assert.doesNotMatch(bordas, /\.rr-borda--ferro-rebitado::after\s*\{[^}]*inset:\s*-/s);
    assert.doesNotMatch(ajustes, /\.rr-borda--ferro-rebitado::after/);
    const imagem = ler(caminho);
    assert.match(imagem, /<svg\s/);
    assert.match(imagem, /cx="7" cy="7"/);
    assert.match(imagem, /cx="50" cy="7"/);
    assert.match(imagem, /cx="93" cy="93"/);
});
