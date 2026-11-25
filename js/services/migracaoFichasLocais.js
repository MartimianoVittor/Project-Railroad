import { CHAVE_STORAGE } from '../core/storage.js?v=1.4.25';
import { CHAVE_ATIVA, PREFIXO_RASCUNHO, nomeValido } from './fichasLocaisChaves.js?v=1.4.25';

const CHAVE_INDICE_ANTIGO = 'railroad_fichas_locais_v1';
const CHAVE_MIGRADA_ANTIGA = 'railroad_ficha_legada_migrada_v1';
const PREFIXO_FICHA_ANTIGO = 'railroad_ficha_local:';
const ID_FICHA_LEGADA = 'railroad_legado_v1';

/** Cada chave antiga só é liberada depois da confirmação da transação de destino. */
export async function migrarArmazenamentoAntigo({ armazenamento, banco, fichas, rascunhos, normalizarFicha }) {
    const chaves = new Set();
    try {
        const indice = JSON.parse(armazenamento.getItem(CHAVE_INDICE_ANTIGO) || '[]');
        if (Array.isArray(indice)) {
            for (const registro of indice) {
                if (registro?.id) chaves.add(PREFIXO_FICHA_ANTIGO + registro.id);
            }
        }
    } catch (erro) {
        console.warn('Índice antigo inválido; procurando fichas por chave.', erro);
    }
    // Recupera também fichas que não tenham sido incluídas no índice antigo.
    for (let posicao = 0; posicao < (armazenamento.length || 0); posicao++) {
        const chave = armazenamento.key(posicao);
        if (chave?.startsWith(PREFIXO_FICHA_ANTIGO) || chave?.startsWith(PREFIXO_RASCUNHO))
            chaves.add(chave);
    }

    let migracaoCompleta = true;
    for (const chave of chaves) {
        const texto = armazenamento.getItem(chave);
        if (!texto) continue;
        try {
            const registro = JSON.parse(texto);
            if (chave.startsWith(PREFIXO_FICHA_ANTIGO)) {
                const id = chave.slice(PREFIXO_FICHA_ANTIGO.length);
                if (!id || registro.id !== id) throw new Error('Identificador de ficha inválido.');
                if (!fichas.has(id)) {
                    await banco.gravarFicha(registro);
                    fichas.set(id, registro);
                }
            } else if (chave.startsWith(PREFIXO_RASCUNHO)) {
                if (!registro?.dados) throw new Error('Rascunho inválido.');
                if (!rascunhos.has(chave)) {
                    const rascunho = { ...registro, chave };
                    await banco.gravarRascunho(rascunho);
                    rascunhos.set(chave, rascunho);
                }
            }
            armazenamento.removeItem(chave);
        } catch (erro) {
            migracaoCompleta = false;
            console.warn(`Registro antigo preservado (${chave}).`, erro);
        }
    }

    const textoLegado = armazenamento.getItem(CHAVE_STORAGE);
    if (textoLegado) {
        try {
            if (!fichas.has(ID_FICHA_LEGADA)) {
                const dados = normalizarFicha(JSON.parse(textoLegado));
                const registro = {
                    id: ID_FICHA_LEGADA,
                    titulo: nomeValido(dados.personagem?.['nome-personagem'] || 'Ficha antiga'),
                    dados,
                    updatedAt: new Date().toISOString(),
                };
                await banco.gravarFicha(registro);
                fichas.set(registro.id, registro);
                if (!armazenamento.getItem(CHAVE_ATIVA))
                    armazenamento.setItem(CHAVE_ATIVA, registro.id);
            }
            armazenamento.removeItem(CHAVE_STORAGE);
        } catch (erro) {
            migracaoCompleta = false;
            console.warn('A ficha legada foi preservada para recuperação.', erro);
        }
    }

    if (migracaoCompleta) {
        armazenamento.removeItem(CHAVE_INDICE_ANTIGO);
        armazenamento.removeItem(CHAVE_MIGRADA_ANTIGA);
    }
    if (!migracaoCompleta)
        throw new Error('Algumas fichas antigas não puderam ser migradas. Os originais foram preservados.');
}
