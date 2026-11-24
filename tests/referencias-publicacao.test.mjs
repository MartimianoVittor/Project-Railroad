import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const versao = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8')).version;
function caminhar(pasta, extensao) {
    return readdirSync(resolve(raiz, pasta), { withFileTypes: true }).flatMap((entrada) => {
        const sub = join(pasta, entrada.name);
        if (entrada.isDirectory()) return caminhar(sub, extensao);
        return sub.endsWith(extensao) ? [sub] : [];
    });
}

test('todos os módulos e imports CSS locais existem e usam a revisão única', () => {
    for (const caminho of caminhar('js', '.js')) {
        const conteudo = readFileSync(join(raiz, caminho), 'utf8');
        for (const casamento of conteudo.matchAll(/(?:from\s*['"]|import\(\s*['"]|^\s*import\s*['"])(\.{1,2}\/[^'"\s]+\.js)(?:\?v=([^'"]+))?/gm)) {
            const [,, revisao] = casamento;
            const sub = casamento[1];
            assert.equal(revisao, versao, `Revisão de ${caminho} → ${sub}`);
            assert.ok(existsSync(resolve(raiz, dirname(caminho), sub)), `Import ausente: ${caminho} → ${sub}`);
        }
    }
    for (const caminho of caminhar('css', '.css')) {
        const conteudo = readFileSync(join(raiz, caminho), 'utf8');
        for (const casamento of conteudo.matchAll(/@import\s+url\(\s*['"]?(\.{1,2}\/[^'"\)\s]+\.css)(?:\?v=([^'"\)]+))?/g)) {
            assert.equal(casamento[2], versao, `CSS sem versão atual: ${caminho}`);
            assert.ok(existsSync(resolve(raiz, dirname(caminho), casamento[1])), `CSS ausente: ${caminho}`);
        }
    }
    const index = readFileSync(join(raiz, 'index.html'), 'utf8');
    for (const casamento of index.matchAll(/(?:src|href)="((?:js|css)\/[^"?]+\.(?:js|css))(?:\?v=([^\"]+))?"/g)) {
        assert.equal(casamento[2], versao, `Versão no index: ${casamento[1]}`);
        assert.ok(existsSync(join(raiz, casamento[1])), `Arquivo ausente: ${casamento[1]}`);
    }
});
