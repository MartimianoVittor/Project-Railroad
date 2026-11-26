/** Valida arquivos JavaScript do projeto usando o parser do próprio Node.js. */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const raiz = fileURLToPath(new URL('../', import.meta.url));
function listar(pasta) {
    return readdirSync(pasta, { withFileTypes: true }).flatMap((e) => {
        const caminho = join(pasta, e.name);
        return e.isDirectory() ? listar(caminho) : /\.(?:m?js)$/.test(e.name) ? [caminho] : [];
    });
}
const arquivos = [...listar(join(raiz, 'js')), ...listar(join(raiz, 'scripts')), ...listar(join(raiz, 'tests'))];
const erros = [];
for (const arquivo of arquivos) {
    const r = spawnSync(process.execPath, ['--check', arquivo], { encoding: 'utf8' });
    if (r.status !== 0) erros.push(`${arquivo}: ${r.stderr.trim() || r.error?.message}`);
}
if (erros.length) {
    console.error(`Sintaxe inválida em ${erros.length} arquivo(s):\n${erros.join('\n')}`);
    process.exitCode = 1;
} else console.log(`Sintaxe: ${arquivos.length}/${arquivos.length} arquivos JavaScript válidos.`);
