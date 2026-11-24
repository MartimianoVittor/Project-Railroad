import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OPCOES_VISUAIS } from '../js/modules/aparencia/preferencias.js';
const ler = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

test('as janelas da plataforma Jogador acompanham o fundo e a borda selecionados', () => {
    const js = ler('js/modules/aparencia/visual.js');
    assert.match(js, /SELETOR_JANELAS = 'dialog\.painel-fichas'/);
    assert.match(js, /personalizarJanelas\(preferencias\)/);
    assert.match(js, /aplicarVariante\(janela, CLASSIFICACOES\.fundo, preferencias\.fundoCartao\)/);
    assert.match(js, /aplicarVariante\(janela, CLASSIFICACOES\.borda, preferencias\.borda\)/);
    const css = ler('css/janelas-jogador.css');
    assert.match(css, /background-color: var\(--rr-textura-cor\)/);
    assert.match(css, /color: var\(--rr-leitura-campo-texto\)/);
    assert.match(ler('css/main.css'), /janelas-jogador\.css/);
});

test('as opções, fundos e bordas são os modelos corretos do Jogador', () => {
    assert.equal(OPCOES_VISUAIS.botao.length, 3);
    assert.equal(OPCOES_VISUAIS.retratoJogador.length, 6);
    assert.equal(OPCOES_VISUAIS.retratoPersonagem.length, 6);
    assert.equal(OPCOES_VISUAIS.fundoCartao.length, 9);
    assert.equal(OPCOES_VISUAIS.borda.length, 9);
    const css = ler('css/kit-western.css');
    for (const compartilhado of ['botoes','retratos','fundos','bordas'])
        assert.match(css, new RegExp(`tema/${compartilhado}\\.css`));
    assert.doesNotMatch(ler('index.html'), /mesa-29|personalizacaoMestre|janelas-personalizadas/);
});
