/**
 * Garante a mesma revisão em TODOS os imports locais de JS/CSS do deploy.
 * Pode ser executado repetidamente; não modifica URLs de CDN nem assets.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const raiz = new URL('../', import.meta.url);
const versao = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
if (!/^\d+\.\d+\.\d+$/.test(versao)) throw new Error('Versão inválida no package.json.');
function arquivos(pasta) {
    const saida = [];
    for (const entrada of readdirSync(new URL(pasta, raiz), { withFileTypes: true })) {
        const caminho = join(pasta, entrada.name).replaceAll('\\', '/');
        if (entrada.isDirectory()) saida.push(...arquivos(caminho));
        else saida.push(caminho);
    }
    return saida;
}
function atualizar(caminho, transformar) {
    const url = new URL(caminho, raiz);
    const antes = readFileSync(url, 'utf8');
    const depois = transformar(antes);
    if (depois !== antes) writeFileSync(url, depois);
}
const stamp = (base, ext) => `${base}.${ext}?v=${versao}`;
for (const caminho of arquivos('js').filter((a) => a.endsWith('.js'))) {
    atualizar(caminho, (codigo) => codigo
        // imports locais estáticos, dinâmicos e por efeito colateral.
        .replace(/(from\s*['"]|import\(\s*['"]|^\s*import\s*['"])(\.{1,2}\/[^'"\s?]+)\.js(?:\?v=[^'"]+)?/gm,
            (_trecho, inicio, base) => inicio + stamp(base, 'js')));
}
for (const caminho of arquivos('css').filter((a) => a.endsWith('.css'))) {
    atualizar(caminho, (codigo) => codigo
        .replace(/(@import\s+url\(\s*['"]?)(\.{1,2}\/[^'")\s?]+)\.css(?:\?v=[^'")]+)?/g,
            (_trecho, inicio, base) => inicio + stamp(base, 'css')));
}
atualizar('index.html', (html) => html
    .replace(/((?:src|href)=["])((?:css|js)\/[^"?]+)\.(js|css)(?:\?v=[^"]+)?/g,
        (_trecho, inicio, base, extensao) => inicio + stamp(base, extensao)));
console.log(`Railroad Jogador: referências locais sincronizadas para v=${versao}.`);
