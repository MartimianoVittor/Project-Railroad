import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../css/janelas-jogador.css', import.meta.url), 'utf8');
test('personalização respeita a paleta do fundo selecionado sem cartões brancos', () => {
  assert.match(css, /#personalizacao\.rr-leitura-automatica \.rr-grupo-visual/);
  assert.match(css, /background: transparent !important/);
  assert.match(css, /color: var\(--rr-leitura-titulo\) !important/);
  assert.match(css, /background: var\(--rr-leitura-painel\) !important/);
  assert.doesNotMatch(css, /#personalizacao[^\n]*\.rr-grupo-visual\s*\{[^}]*background:\s*#(?:fff|fbf|f4e)/i);
});
test('a prévia mantém as cores da própria textura escolhida', () => {
  assert.match(css, /#personalizacao \.rr-previa-cartao :is\(p, label\)/);
  assert.match(css, /color: var\(--rr-leitura-texto\) !important/);
});
