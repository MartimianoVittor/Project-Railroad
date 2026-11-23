import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OPCOES_VISUAIS, validarPreferencias, migrarPreferenciasAnteriores } from '../js/modules/personalizacao.js';

const ler = (caminho) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');
const index = ler('index.html');
const conta = ler('html/dialogs/conta.html');
const fragmento = ler('html/personalizacao.html');
const navegacao = ler('js/navegacao.js');
const cssKit = ler('css/kit-western.css');
const cssIntegracao = ler('css/personalizacao.css');
const js = ler('js/modules/personalizacao.js');

assert.match(conta, /<dialog id="personalizacao"/);
assert.match(conta, /data-include="html\/personalizacao.html"/);
assert.doesNotMatch(index, /href="#personalizacao"/);
assert.doesNotMatch(index, /id="personalizacao-mobile"/);
assert.doesNotMatch(navegacao, /'quadro-mobile', 'personalizacao'/);
for (const campo of ['botao', 'retratoJogador', 'retratoPersonagem', 'fundoTela', 'fundoCartao', 'borda']) {
    assert.match(fragmento, new RegExp(`data-opcoes="${campo}"`));
    assert.ok(OPCOES_VISUAIS[campo].length > 1);
}
assert.match(conta, /id="rr-restaurar-aparencia"/);
assert.match(conta, /id="rr-salvar-aparencia"/);
assert.doesNotMatch(fragmento, /Aparência do Railroad/);
assert.match(js, /railroad_jogador_aparencia_v2/);
assert.match(js, /railroad_jogador_aparencia_v1/);
for (const id of ['botao-cartucho-12', 'botao-faca-bowie', 'retrato-camafeu-de-latao', 'fundo-tabua', 'borda-filete']) {
    assert.match(cssKit, new RegExp(`rr-(?:botao|retrato|fundo|borda)--${id.replace(/^(botao|retrato|fundo|borda)-/, '')}`));
}
assert.match(cssIntegracao, /rr-moldura-alvo\.rr-fundo--tabua/);
assert.match(cssIntegracao, /rr-moldura-alvo\.rr-borda--latonada/);
assert.deepEqual(validarPreferencias({
    botao: 'faca-bowie', retratoJogador: 'estrela-de-xerife',
    retratoPersonagem: 'cartaz-de-procurado', fundoTela: 'tabua',
    fundoCartao: 'jornal', borda: 'filete',
}), {
    botao: 'faca-bowie', retratoJogador: 'estrela-de-xerife',
    retratoPersonagem: 'cartaz-de-procurado', fundoTela: 'tabua',
    fundoCartao: 'jornal', borda: 'filete',
});
assert.deepEqual(validarPreferencias({
    botao: 'data:evil', retratoJogador: 'javascript:evil', fundoCartao: 'url(evil)',
}), {
    botao: 'cartucho-45', retratoJogador: 'estrela-de-xerife', retratoPersonagem: 'cartaz-de-procurado',
    fundoTela: 'pergaminho', fundoCartao: 'pergaminho', borda: 'latonada',
});
assert.deepEqual(migrarPreferenciasAnteriores({
    botao: 'bowie', retrato: 'camafeu', fundo: 'topografica', borda: 'costura',
}), {
    botao: 'faca-bowie', retratoJogador: 'camafeu-de-latao',
    retratoPersonagem: 'camafeu-de-latao', fundoTela: 'mapa-topografico',
    fundoCartao: 'pergaminho', borda: 'costura',
});
console.log('OK: kit original, Conta, seis categorias independentes e migração.');

// O kit temático deve atingir APENAS os três links de seleção de página.
assert.match(js, /const SELETOR_BOTOES = '\.barra-lateral \.menu-navegacao a\.btn-nav\[data-aba\]'/);
assert.doesNotMatch(js, /\.painel-fichas button\.btn-oeste/);
assert.doesNotMatch(js, /\.acoes-mobile button\.btn-oeste/);
assert.doesNotMatch(js, /rr-botao-acao/);
assert.match(cssIntegracao, /\.btn-nav\.rr-botao-nav::before/);
assert.match(cssIntegracao, /\.btn-nav\.rr-botao-nav \.cartucho-svg/);

// Cada textura recebe sua própria paleta, alterada automaticamente no cartão.
assert.match(js, /cartao\.classList\.add\('rr-leitura-automatica'\)/);
assert.match(cssIntegracao, /\.rr-leitura-automatica :is\(input\[type='text'\]/);
for (const [identificador] of OPCOES_VISUAIS.fundoCartao) {
    if (identificador === 'padrao') continue;
    const bloco = cssIntegracao.match(new RegExp(`\\.rr-leitura-automatica\\.rr-fundo--${identificador} \\{([^}]*)\\}`));
    assert.ok(bloco, `Paleta ausente para ${identificador}`);
    for (const variavel of ['--rr-leitura-texto','--rr-leitura-titulo','--rr-leitura-campo','--rr-leitura-campo-texto']) {
        assert.ok(bloco[1].includes(variavel + ':'), `${variavel} ausente em ${identificador}`);
    }
}
console.log('OK: somente três abas temáticas e contraste automático para nove texturas.');

assert.equal(validarPreferencias({}).retratoPersonagem, "cartaz-de-procurado");
assert.match(cssIntegracao, /--rr-filtro: brightness\(1\);\s*transform: translate\(2px, -2px\)/);
assert.doesNotMatch(cssKit, /rr-botao--[^\s{]+(?:aria-pressed|aria-current)/);

assert.match(cssIntegracao, /\.rr-leitura-automatica \.area-canvas \{\s*background-color: var\(--rr-leitura-campo\)/);
assert.match(ler('js/modules/quadro/desenho.js'), /'destination-out'/);

assert.match(conta, /id="abrir-personalizacao" class="btn-oeste"/);
assert.match(js, /painel.showModal\(\)/);
assert.match(fragmento, /data-previa="cartao"/);

assert.equal(OPCOES_VISUAIS.fundoTela.length, 9);
assert.equal(OPCOES_VISUAIS.fundoCartao.length, 9);
assert.equal(OPCOES_VISUAIS.borda.length, 9);
assert.ok(!OPCOES_VISUAIS.borda.some(([id]) => id === 'hachurada'));
assert.equal(validarPreferencias({borda:'hachurada'}).borda, 'ornamental');
for (const id of ['ornamental','ferro-rebitado']) {
    assert.equal(validarPreferencias({borda:id}).borda, id);
    assert.ok(cssKit.includes(`.rr-borda--${id}`));
    assert.ok(cssIntegracao.includes(`.rr-borda--${id}`));
}
assert.equal(validarPreferencias({fundoTela:'aco-envelhecido',fundoCartao:'aco-envelhecido'}).fundoCartao,'aco-envelhecido');

// O quadro móvel não pode manter o tema ao retornar ao contêiner desktop.
assert.match(js, /if \(cartao\.matches\(SELETOR_CARTOES\)\) return;/);
assert.match(js, /cartao\.classList\.remove\('rr-moldura-alvo', 'rr-leitura-automatica'\)/);
assert.match(cssIntegracao, /background-color: var\(--rr-leitura-campo\) !important;\s*background-image: none !important;/);
