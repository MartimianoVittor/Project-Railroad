import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalizarEnderecoRetrato } from '../js/modules/retrato.js';

const raiz = new URL('../', import.meta.url);
const ler = (caminho) => readFileSync(new URL(caminho, raiz), 'utf8');

test('árvores reais de CSS/JS e imagens HTML/CSS não contêm referências órfãs', () => {
    const verificador = fileURLToPath(new URL('../scripts/verificar-recursos.mjs', import.meta.url));
    const saida = execFileSync(process.execPath, [verificador], { encoding: 'utf8' });
    assert.match(saida, /nenhum recurso ausente/i);
});

test('layout principal existe e mantém as colunas das três páginas', () => {
    const layout = ler('css/layout.css');
    assert.match(layout, /#jogador,\s*#personagem,\s*#inventario/);
    assert.match(layout, /grid-template-columns/);
    assert.ok(ler('css/main.css').includes('./layout.css'));
});

test('retratos históricos continuam compatíveis sem reintroduzir PNGs pesados', () => {
    assert.equal(normalizarEnderecoRetrato('assets/imgs/imagemJogadorPlaceholder.png'),
        'assets/imgs/imagemJogadorPlaceholder.webp');
    assert.equal(normalizarEnderecoRetrato('assets/imgs/imagemPersonagemPlaceholder.png'),
        'assets/imgs/imagemPersonagemPlaceholder.webp');
    assert.equal(normalizarEnderecoRetrato('data:image/png;base64,test'), 'data:image/png;base64,test');
    assert.equal(normalizarEnderecoRetrato(''), 'assets/imgs/retrato-vazio.svg');
    for (const nome of ['imagemJogadorPlaceholder.webp', 'imagemPersonagemPlaceholder.webp']) {
        assert.ok(existsSync(new URL(`../assets/imgs/${nome}`, import.meta.url)));
    }
});
