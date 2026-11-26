/**
 * Verificação estática de integridade do Railroad Jogador.
 * Percorre as árvores reais de importação de CSS/JS e testa os recursos HTML/CSS.
 * Não assume que arquivos obtidos dinamicamente pelo Supabase sejam recursos locais.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(fileURLToPath(new URL('../', import.meta.url)));
const erros = [];
const cssVistos = new Set();
const jsVistos = new Set();
const recursos = new Set();
const caminhoRelativo = (arquivo) => relative(raiz, arquivo).replaceAll('\\', '/');

function listar(pasta, extensao) {
    if (!existsSync(pasta)) return [];
    return readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
        const arquivo = join(pasta, entrada.name);
        return entrada.isDirectory() ? listar(arquivo, extensao)
            : extname(entrada.name) === extensao ? [arquivo] : [];
    });
}

function verificar(caminho, origem, posicao = 'recurso') {
    const url = caminho.trim().replace(/^['"]|['"]$/g, '');
    if (!url || /^(?:data:|blob:|https?:|mailto:|tel:|#|var\(|\/\/)/i.test(url)) return null;
    const semSufixo = url.split(/[?#]/, 1)[0];
    if (!semSufixo || semSufixo.startsWith('/')) return null;
    const arquivo = resolve(posicao === 'html' ? raiz : dirname(origem), semSufixo);
    const caminhoInterno = relative(raiz, arquivo);
    if (caminhoInterno === '..' || caminhoInterno.startsWith('..' + sep) || isAbsolute(caminhoInterno)) {
        erros.push(`${caminhoRelativo(origem)}: referência fora do projeto: ${url}`);
        return null;
    }
    if (!existsSync(arquivo)) {
        erros.push(`${caminhoRelativo(origem)}: recurso ausente: ${url}`);
        return null;
    }
    recursos.add(arquivo);
    return arquivo;
}

function css(arquivo) {
    if (!arquivo || cssVistos.has(arquivo)) return;
    cssVistos.add(arquivo);
    const fonte = readFileSync(arquivo, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    // Regras @import (devem formar um único grafo a partir de main.css).
    for (const casamento of fonte.matchAll(/@import\s+(?:url\(\s*)?["']?([^"'\s)]+\.css(?:\?[^"'\s)]+)?)/g)) {
        const filho = verificar(casamento[1], arquivo);
        if (filho) css(filho);
    }
    // Fundos, texturas, SVGs e fontes locais; #fragmentos SVG não exigem arquivo novo.
    for (const casamento of fonte.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\)/g)) {
        verificar(casamento[1] || casamento[2] || casamento[3], arquivo);
    }
}

function js(arquivo) {
    if (!arquivo || jsVistos.has(arquivo)) return;
    jsVistos.add(arquivo);
    const fonte = readFileSync(arquivo, 'utf8');
    for (const casamento of fonte.matchAll(/(?:from\s*['"]|import\s*\(\s*['"]|^\s*import\s*['"])(\.{1,2}\/[^'"\s)]+\.js(?:\?[^'"\s)]+)?)/gm)) {
        const filho = verificar(casamento[1], arquivo);
        if (filho) js(filho);
    }
}

const index = join(raiz, 'index.html');
const htmls = [index, ...listar(join(raiz, 'html'), '.html')];
for (const html of htmls) {
    const fonte = readFileSync(html, 'utf8').replace(/<!--([\s\S]*?)-->/g, '');
    for (const casamento of fonte.matchAll(/(?:\bsrc|\bhref|\bdata-include)\s*=\s*["']([^"']+)["']/g)) {
        const local = verificar(casamento[1], html, 'html');
        if (local && extname(local) === '.css') css(local);
        if (local && extname(local) === '.js') js(local);
    }
}
// O carregador de fragmentos inicia o módulo principal com new URL('./main.js', script).
js(verificar('js/main.js', index, 'html'));
const cssDesconectados = listar(join(raiz, 'css'), '.css').filter(p => !cssVistos.has(p));
const jsDesconectados = listar(join(raiz, 'js'), '.js').filter(p => !jsVistos.has(p));
for (const arquivo of cssDesconectados) erros.push(`CSS não carregado: ${caminhoRelativo(arquivo)}`);
for (const arquivo of jsDesconectados) erros.push(`JS não carregado: ${caminhoRelativo(arquivo)}`);

if (erros.length) {
    console.error(`Integridade: ${erros.length} problema(s):\n${erros.map(e => `- ${e}`).join('\n')}`);
    process.exitCode = 1;
} else {
    console.log(`Integridade: ${recursos.size} referências locais, ${cssVistos.size} CSS e ${jsVistos.size} JS conectados; nenhum recurso ausente.`);
}
