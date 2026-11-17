import { normalizarFicha } from '../core/validacao.js';

/** Identidade estável quando disponível; hash do JSON normalizado para fichas antigas. */
export async function identidadeDaImportacao(dados) {
    const ficha = normalizarFicha(dados);
    const idPersistente = ficha.railroadId;
    if (typeof idPersistente === 'string' && /^[a-zA-Z0-9_-]{8,90}$/.test(idPersistente))
        return `id:${idPersistente}`;

    const conteudo = new TextEncoder().encode(JSON.stringify(ficha));
    const assinatura = await crypto.subtle.digest('SHA-256', conteudo);
    return `sha256:${Array.from(new Uint8Array(assinatura), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}
