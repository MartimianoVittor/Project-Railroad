import { CHAVE_STORAGE } from '../core/storage.js';
import { abrirBancoLocal } from './bancoLocal.js';

const CHAVE_INDICE_ANTIGO = 'railroad_fichas_locais_v1';
const CHAVE_ATIVA = 'railroad_ficha_local_ativa_v1';
const CHAVE_MIGRADA_ANTIGA = 'railroad_ficha_legada_migrada_v1';
const PREFIXO_FICHA_ANTIGO = 'railroad_ficha_local:';
const PREFIXO_RASCUNHO = 'railroad_rascunho:';
const ID_FICHA_LEGADA = 'railroad_legado_v1';

const nomeValido = (valor) => String(valor || '').trim().slice(0, 120) || 'Personagem local';
const chaveRascunho = (uid, id) => `${PREFIXO_RASCUNHO}${uid}:${id}`;

/**
 * Consultas imediatas na memória; gravações sequenciais no IndexedDB.
 * flush() confirma que todas as transações terminaram antes de trocar de ficha.
 */
export function criarRepositorioLocal(armazenamento = localStorage, abrirBanco = abrirBancoLocal) {
    const fichas = new Map();
    const rascunhos = new Map();
    let banco;
    let fila = Promise.resolve();
    let erroGravacao = null;

    function enfileirar(gravar) {
        const operacao = fila.then(gravar);
        fila = operacao.catch((erro) => { erroGravacao = erro; });
        return operacao;
    }

    async function flush() {
        await fila;
        if (erroGravacao) {
            const erro = erroGravacao;
            erroGravacao = null;
            throw erro;
        }
    }

    function obter(id) {
        return fichas.get(id) || null;
    }

    function criar(titulo, dados) {
        const registro = {
            id: crypto.randomUUID(),
            titulo: nomeValido(titulo),
            dados,
            updatedAt: new Date().toISOString(),
        };
        fichas.set(registro.id, registro);
        enfileirar(() => banco.gravarFicha(registro));
        return registro;
    }

    function salvar(id, dados) {
        const anterior = obter(id);
        if (!anterior) throw new Error('Ficha local não encontrada.');
        const atualizado = { ...anterior, dados, updatedAt: new Date().toISOString() };
        fichas.set(id, atualizado);
        enfileirar(() => banco.gravarFicha(atualizado));
        return atualizado;
    }

    function renomear(id, titulo) {
        const anterior = obter(id);
        if (!anterior) throw new Error('Ficha local não encontrada.');
        const atualizado = { ...anterior, titulo: nomeValido(titulo), updatedAt: new Date().toISOString() };
        fichas.set(id, atualizado);
        enfileirar(() => banco.gravarFicha(atualizado));
        return atualizado;
    }

    function excluir(id) {
        fichas.delete(id);
        enfileirar(() => banco.excluirFicha(id));
        if (armazenamento.getItem(CHAVE_ATIVA) === id)
            armazenamento.removeItem(CHAVE_ATIVA);
    }

    function lerRascunho(uid, id) {
        return rascunhos.get(chaveRascunho(uid, id)) || null;
    }

    function gravarRascunho(uid, id, dados) {
        const rascunho = { chave: chaveRascunho(uid, id), dados, token: crypto.randomUUID() };
        rascunhos.set(rascunho.chave, rascunho);
        enfileirar(() => banco.gravarRascunho(rascunho));
        return rascunho;
    }

    function apagarRascunho(uid, id) {
        const chave = chaveRascunho(uid, id);
        rascunhos.delete(chave);
        enfileirar(() => banco.excluirRascunho(chave));
    }

    /** Remove cópias antigas somente após cada gravação confirmada no IndexedDB. */
    async function migrarAntiga(normalizarFicha) {
        banco = await abrirBanco();
        for (const registro of await banco.listarFichas()) fichas.set(registro.id, registro);
        for (const rascunho of await banco.listarRascunhos()) rascunhos.set(rascunho.chave, rascunho);

        const chaves = new Set();
        try {
            const indice = JSON.parse(armazenamento.getItem(CHAVE_INDICE_ANTIGO) || '[]');
            for (const registro of indice) chaves.add(`${PREFIXO_FICHA_ANTIGO}${registro.id}`);
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

    return {
        listar: () => [...fichas.values()]
            .map(({ id, titulo, updatedAt }) => ({ id, titulo, updatedAt }))
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        obter, criar, salvar, renomear, excluir, flush, migrarAntiga,
        lerRascunho, gravarRascunho, apagarRascunho,
        ativa: () => armazenamento.getItem(CHAVE_ATIVA),
        selecionar: (id) => armazenamento.setItem(CHAVE_ATIVA, id),
    };
}
