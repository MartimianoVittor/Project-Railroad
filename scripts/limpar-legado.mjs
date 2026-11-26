/** Remove resíduos conhecidos da versão anterior SOMENTE após confirmação do usuário.
 * Proteção por SHA-256: um arquivo personalizado não será apagado.
 */
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const assinaturas = Object.freeze({
    "css/identidade-railroad.css": "a914b609d463e2e308427463e72989d889a52df27edc8c4165077717f973e1b6",
    "js/mobile.js": "b6e814d65d072654ed285b30e17f1ed28ed759eb6d24d11a92bc12b068bdbf77",
    "js/core/ficha.js": "f01699f5bf8a254ee22e3c25f8b9db0ecf623d45427107aa12274659a7bd5f13",
    "assets/imgs/imagemJogadorPlaceholder.png": "2c81d8be768fb5485ed513c918006cb2380d0dd06340b3a45489e3e231c8002e",
    "assets/imgs/imagemPersonagemPlaceholder.png": "47cc03a728a3222a5e3374a99382c04480c199d98081d6984deba8f0d27cfa0a",
    "scripts/limpar-residuos-mestre.mjs": "09b8c985cddedd68a7e1efb5642dc333162cc12616c77c6ca7ca945d2ddf9170"
});
const aplicar = process.argv.includes('--aplicar');
let presentes = 0;
let preservados = 0;
for (const [caminho, hashEsperado] of Object.entries(assinaturas)) {
    const arquivo = resolve(raiz, caminho);
    if (!existsSync(arquivo)) continue;
    const hash = createHash('sha256').update(readFileSync(arquivo)).digest('hex');
    if (hash !== hashEsperado) {
        console.warn(`Preservado (conteúdo diferente do conhecido): ${caminho}`);
        preservados++;
        continue;
    }
    presentes++;
    if (aplicar) {
        unlinkSync(arquivo);
        console.log(`Removido: ${caminho}`);
    } else console.log(`Pode remover: ${caminho}`);
}
if (!aplicar) console.log(`Prévia: ${presentes} arquivo(s) de legado, ${preservados} preservado(s). Para confirmar: npm run limpar:legado -- --aplicar`);
else console.log(`Limpeza concluída: ${presentes} arquivo(s), ${preservados} preservado(s).`);
