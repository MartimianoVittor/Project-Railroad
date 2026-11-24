import { readFileSync } from 'node:fs';

/** Expande as folhas locais na ordem em que o navegador as aplica. */
export function lerEstilos(caminho) {
    function expandir(url) {
        const texto = readFileSync(url, 'utf8');
        return texto.replace(/@import\s+url\(["']([^"']+)["']\);/g, (_, relativo) =>
            expandir(new URL(relativo, url)));
    }
    return expandir(new URL('../../' + caminho, import.meta.url));
}
